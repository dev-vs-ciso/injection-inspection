import requests
import time
import json

def test_basic_functionality():
    """Test basic API functionality"""
    tests_passed = 0
    total_tests = 5
    
    # Test 1: Health check
    try:
        response = requests.get('http://localhost:11434/api/version', timeout=5)
        if response.status_code == 200:
            print("✓ Health check passed")
            tests_passed += 1
        else:
            print("✗ Health check failed")
    except Exception as e:
        print(f"✗ Health check error: {e}")

    # Test 2: Model availability
    try:
        response = requests.get('http://localhost:11434/api/tags', timeout=5)
        if response.status_code == 200 and 'tinyllama' in response.text:
            print("✓ TinyLlama model available")
            tests_passed += 1
        else:
            print("✗ TinyLlama model not found")
    except Exception as e:
        print(f"✗ Model check error: {e}")

    # Test 3: Basic generation
    try:
        response = requests.post('http://localhost:11434/api/generate',
            json={
                "model": "tinyllama",
                "prompt": "Hello",
                "stream": False,
                "options": {"num_predict": 5}
            }, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if 'response' in result and result['response'].strip():
                print("✓ Basic generation works")
                tests_passed += 1
            else:
                print("✗ Basic generation returned empty response")
        else:
            print(f"✗ Basic generation failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Basic generation error: {e}")

    # Test 4: OpenAI compatibility
    try:
        response = requests.post('http://localhost:11434/v1/chat/completions',
            json={
                "model": "tinyllama",
                "messages": [
                    {"role": "user", "content": "Hi"}
                ],
                "max_tokens": 10
            }, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                print("✓ OpenAI API compatibility works")
                tests_passed += 1
            else:
                print("✗ OpenAI API returned invalid format")
        else:
            print(f"✗ OpenAI API failed: {response.status_code}")
    except Exception as e:
        print(f"✗ OpenAI API error: {e}")

    # Test 5: Performance check
    try:
        start_time = time.time()
        response = requests.post('http://localhost:11434/api/generate',
            json={
                "model": "tinyllama",
                "prompt": "Test",
                "stream": False,
                "options": {"num_predict": 3}
            }, timeout=15)
        end_time = time.time()
        
        if response.status_code == 200:
            response_time = end_time - start_time
            print(f"✓ Performance test: {response_time:.2f}s response time")
            tests_passed += 1
        else:
            print("✗ Performance test failed")
    except Exception as e:
        print(f"✗ Performance test error: {e}")

    print(f"\nResults: {tests_passed}/{total_tests} tests passed")
    return tests_passed == total_tests

if __name__ == "__main__":
    print("Running TinyLlama integration tests...\n")
    success = test_basic_functionality()
    print(f"\nOverall: {'SUCCESS' if success else 'SOME TESTS FAILED'}")