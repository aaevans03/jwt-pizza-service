# Check if host is provided as a command line argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1


# Add users
response=$(curl -s -X PUT $host/api/auth -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
token=$(echo $response | jq -r '.token')

# Add franchise and store
curl -X GET $host/api/user -H 'Content-Type: application/json' -H "Authorization: Bearer $token"

echo "Got user list"
