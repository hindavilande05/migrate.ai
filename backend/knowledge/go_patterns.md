# Go Idiomatic Patterns

## Error handling
In Go, errors are values. Every function that can fail returns (result, error).
Never panic in library code. Always check errors explicitly.

```go
func GetUser(id int) (*User, error) {
    user, err := db.QueryRow("SELECT * FROM users WHERE id = $1", id)
    if err != nil {
        return nil, fmt.Errorf("GetUser: %w", err)
    }
    return user, nil
}
```

## Interfaces and dependency injection
Go uses structural typing. Define small interfaces at the point of use.
Inject dependencies through constructors, not global state.

```go
type UserRepository interface {
    FindByID(ctx context.Context, id int) (*User, error)
    Save(ctx context.Context, u *User) error
}

type UserService struct {
    repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
    return &UserService{repo: repo}
}
```

## Structs and methods
Go has no classes. Use structs with methods. Embed structs for composition.

```go
type Order struct {
    ID       int
    UserID   int
    Total    float64
    Status   string
}

func (o *Order) IsPaid() bool {
    return o.Status == "paid"
}
```

## HTTP handlers with net/http
Use net/http for handlers. No annotation magic — routes registered explicitly.

```go
func NewRouter(svc *OrderService) http.Handler {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /orders/{id}", handleGetOrder(svc))
    return mux
}

func handleGetOrder(svc *OrderService) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        id := r.PathValue("id")
        order, err := svc.GetOrder(r.Context(), id)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        json.NewEncoder(w).Encode(order)
    }
}
```

## Package organisation
One package per directory. Keep packages small and focused.
cmd/ for entry points, internal/ for private packages.

```
myservice/
  cmd/server/main.go
  internal/
    order/
      handler.go
      service.go
      repository.go
    user/
      handler.go
      service.go
```
