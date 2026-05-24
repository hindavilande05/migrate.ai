# Spring Boot to Go Migration Patterns

## @Transactional to database/sql transactions
Spring @Transactional becomes explicit db.BeginTx + defer Rollback + Commit.

```go
func (r *OrderRepo) CreateOrder(ctx context.Context, o *Order) error {
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback() // no-op if Commit succeeds

    if _, err := tx.ExecContext(ctx, insertOrderSQL, o.ID, o.Total); err != nil {
        return fmt.Errorf("insert order: %w", err)
    }
    return tx.Commit()
}
```

## @Service and @Repository to Go interfaces
Spring DI becomes constructor injection. No framework container needed.

```go
// was: @Service + @Autowired
type OrderService struct {
    repo  OrderRepository
    notif NotificationService
}

func NewOrderService(repo OrderRepository, notif NotificationService) *OrderService {
    return &OrderService{repo: repo, notif: notif}
}
```

## @Async and CompletableFuture to goroutines
Fire-and-forget becomes go func(). Parallel tasks become errgroup.

```go
import "golang.org/x/sync/errgroup"

func (s *ReportService) GenerateAll(ctx context.Context, ids []int) error {
    g, ctx := errgroup.WithContext(ctx)
    for _, id := range ids {
        id := id // capture loop var
        g.Go(func() error {
            return s.generate(ctx, id)
        })
    }
    return g.Wait()
}
```

## @RestController to net/http handlers
Spring @RestController + @GetMapping becomes explicit route + handler.

```go
// was: @GetMapping("/users/{id}")
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    user, err := svc.GetUser(r.Context(), id)
    if err != nil {
        http.Error(w, "not found", http.StatusNotFound)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
})
```

## @Aspect / AOP to middleware
Spring AOP interceptors become Go HTTP middleware functions.

```go
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if !validateToken(token) {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

## Java Optional to Go idioms
Java Optional becomes (value, bool) or (value, error).

```go
// Optional.empty() → nil pointer or zero value
func FindByEmail(email string) (*User, bool) {
    // returns nil, false when not found
}

// Optional.orElseThrow() → return error
func GetByEmail(email string) (*User, error) {
    u, ok := FindByEmail(email)
    if !ok {
        return nil, fmt.Errorf("user not found: %s", email)
    }
    return u, nil
}
```

## Java Streams to Go loops
Java Stream API becomes explicit for-loops. Avoid unnecessary abstractions.

```go
// was: orders.stream().filter(o -> o.isPaid()).collect(toList())
var paid []Order
for _, o := range orders {
    if o.IsPaid() {
        paid = append(paid, o)
    }
}

// was: items.stream().mapToInt(Item::getQuantity).sum()
total := 0
for _, item := range items {
    total += item.Quantity
}
```

## Exception handling to error returns
Java checked/unchecked exceptions become typed errors implementing the error interface.

```go
type NotFoundError struct {
    Resource string
    ID       string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s with id %s not found", e.Resource, e.ID)
}

// Callers use errors.As for type checking
var nfe *NotFoundError
if errors.As(err, &nfe) {
    http.Error(w, nfe.Error(), http.StatusNotFound)
}
```

## Concurrency decision table
| Java Pattern | Go Equivalent |
|---|---|
| ExecutorService (fixed pool) | Worker pool: fixed goroutines + buffered channel |
| CompletableFuture.allOf | errgroup.Group |
| CompletableFuture (chained) | Goroutine + channel |
| synchronized method | sync.Mutex |
| volatile field | sync/atomic |
| @Async void | go func() |
