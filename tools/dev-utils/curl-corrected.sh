curl 'http://localhost:3001/api/projects/create-and-start' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: es-US,es-419;q=0.9,es;q=0.8' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNlNWZhNjYyLWZlNzEtNDMwYi05MDg1LTgzOTkyNjViMjYxMyIsImVtYWlsIjoidGVzdDE0QHRlc3Rmb3JnZS5jb20iLCJpYXQiOjE3NTY1MTk5MTMsImV4cCI6MTc1NjYwNjMxM30.waKEM-7Q2rJLHwpdEz1fCUJ1_x64TfttjSW8evHwKHI' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -H 'Referer: http://localhost:5173/' \
  --data-raw '{"title":"Prueba de Chat IA Completa","description":"Esta es una prueba completa del sistema de chat con IA para verificar que todos los endpoints funcionan correctamente y que la validación del backend está operativa."}'
