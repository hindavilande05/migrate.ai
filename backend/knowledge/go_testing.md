# Go Testing Conventions

## Table-driven tests
The standard Go testing pattern. Use a slice of anonymous structs.

```go
func TestGetUser(t *testing.T) {
    tests := []struct {
        name    string
        id      int
        want    *User
        wantErr bool
    }{
        {name: "found", id: 1, want: &User{ID: 1, Name: "Alice"}, wantErr: false},
        {name: "not found", id: 999, want: nil, wantErr: true},
        {name: "invalid id", id: -1, want: nil, wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            svc := NewUserService(mockRepo{})
            got, err := svc.GetUser(context.Background(), tt.id)
            if (err != nil) != tt.wantErr {
                t.Errorf("GetUser() error = %v, wantErr %v", err, tt.wantErr)
            }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("GetUser() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

## Mock interfaces (no third-party libraries)
Define mock structs that implement the interface under test.

```go
type mockUserRepo struct {
    users map[int]*User
    err   error
}

func (m *mockUserRepo) FindByID(_ context.Context, id int) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    u, ok := m.users[id]
    if !ok {
        return nil, &NotFoundError{Resource: "user", ID: fmt.Sprint(id)}
    }
    return u, nil
}

func (m *mockUserRepo) Save(_ context.Context, u *User) error {
    if m.err != nil {
        return m.err
    }
    m.users[u.ID] = u
    return nil
}
```

## Transaction rollback test
Every function using db transactions needs a rollback scenario test.

```go
func TestCreateOrder_RollbackOnError(t *testing.T) {
    repo := &mockOrderRepo{err: errors.New("db error")}
    svc := NewOrderService(repo)
    err := svc.CreateOrder(context.Background(), &Order{ID: 1})
    if err == nil {
        t.Fatal("expected error, got nil")
    }
    if repo.committed {
        t.Error("transaction should not have committed on error")
    }
}
```

## HTTP handler tests
Use httptest.NewRecorder and httptest.NewRequest.

```go
func TestHandleGetOrder(t *testing.T) {
    svc := NewOrderService(&mockOrderRepo{
        orders: map[string]*Order{"1": {ID: "1", Total: 99.99}},
    })
    handler := handleGetOrder(svc)

    req := httptest.NewRequest("GET", "/orders/1", nil)
    req.SetPathValue("id", "1")
    w := httptest.NewRecorder()

    handler(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("status = %d, want 200", w.Code)
    }
}
```

## Testing goroutine / concurrent functions
Use t.Parallel() and a WaitGroup or channel to capture results.

```go
func TestGenerateAll_Parallel(t *testing.T) {
    t.Parallel()
    svc := NewReportService(&mockReportRepo{})
    err := svc.GenerateAll(context.Background(), []int{1, 2, 3, 4, 5})
    if err != nil {
        t.Errorf("GenerateAll() error = %v", err)
    }
}
```

## Testing middleware
Test middleware by wrapping a dummy handler and inspecting the recorder.

```go
func TestAuthMiddleware_Unauthorized(t *testing.T) {
    handler := AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    }))
    req := httptest.NewRequest("GET", "/", nil)
    w := httptest.NewRecorder()
    handler.ServeHTTP(w, req)
    if w.Code != http.StatusUnauthorized {
        t.Errorf("expected 401, got %d", w.Code)
    }
}
```
