#!/usr/bin/env python3
"""
Test script for DeepFace Emotion Detection API
Tests all endpoints and provides sample usage
"""

import requests
import json
import os
import time
from pathlib import Path

# Configuration
BASE_URL = os.getenv('API_URL', 'http://localhost:8000')
TEST_IMAGE_PATH = 'test_image.jpg'  # You'll need to provide a test image

def print_response(response, title):
    """Pretty print API response"""
    print(f"\n{'='*50}")
    print(f"🧪 {title}")
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print(f"{'='*50}")

def test_health_check():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    response = requests.get(f"{BASE_URL}/")
    print_response(response, "Health Check")
    return response.status_code == 200

def test_api_info():
    """Test API info endpoint"""
    print("🔍 Testing API info...")
    response = requests.get(f"{BASE_URL}/info")
    print_response(response, "API Info")
    return response.status_code == 200

def test_system_info():
    """Test system info endpoint"""
    print("🔍 Testing system info...")
    response = requests.get(f"{BASE_URL}/test")
    print_response(response, "System Info")
    return response.status_code == 200

def test_emotion_analysis():
    """Test emotion analysis endpoint"""
    print("🔍 Testing emotion analysis...")
    
    # Check if test image exists
    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"❌ Test image not found: {TEST_IMAGE_PATH}")
        print("Please provide a test image file named 'test_image.jpg'")
        return False
    
    try:
        with open(TEST_IMAGE_PATH, 'rb') as image_file:
            files = {'image': image_file}
            response = requests.post(f"{BASE_URL}/analyze", files=files)
        
        print_response(response, "Emotion Analysis")
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ Error during emotion analysis: {str(e)}")
        return False

def test_error_cases():
    """Test error handling"""
    print("🔍 Testing error cases...")
    
    # Test no file provided
    response = requests.post(f"{BASE_URL}/analyze", files={})
    print_response(response, "No File Provided")
    
    # Test invalid file type
    response = requests.post(f"{BASE_URL}/analyze", files={'image': ('test.txt', 'invalid content', 'text/plain')})
    print_response(response, "Invalid File Type")
    
    # Test non-existent endpoint
    response = requests.get(f"{BASE_URL}/nonexistent")
    print_response(response, "Non-existent Endpoint")

def test_performance():
    """Test API performance"""
    print("🔍 Testing performance...")
    
    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"❌ Test image not found: {TEST_IMAGE_PATH}")
        return
    
    # Measure response times
    times = []
    for i in range(3):
        start_time = time.time()
        
        with open(TEST_IMAGE_PATH, 'rb') as image_file:
            files = {'image': image_file}
            response = requests.post(f"{BASE_URL}/analyze", files=files)
        
        end_time = time.time()
        response_time = end_time - start_time
        times.append(response_time)
        
        print(f"Request {i+1}: {response_time:.2f} seconds (Status: {response.status_code})")
    
    if times:
        avg_time = sum(times) / len(times)
        print(f"\n📊 Performance Summary:")
        print(f"Average response time: {avg_time:.2f} seconds")
        print(f"Min time: {min(times):.2f} seconds")
        print(f"Max time: {max(times):.2f} seconds")

def create_sample_image():
    """Create a simple test image using PIL"""
    try:
        from PIL import Image, ImageDraw
        import numpy as np
        
        # Create a simple test image
        img = Image.new('RGB', (400, 400), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw a simple face
        # Face outline
        draw.ellipse([100, 100, 300, 300], outline='black', width=3)
        # Eyes
        draw.ellipse([150, 150, 180, 180], fill='black')
        draw.ellipse([220, 150, 250, 180], fill='black')
        # Smile
        draw.arc([150, 200, 250, 250], 0, 180, fill='black', width=3)
        
        # Save the image
        img.save(TEST_IMAGE_PATH, 'JPEG')
        print(f"✅ Test image created: {TEST_IMAGE_PATH}")
        return True
        
    except ImportError:
        print("❌ PIL not available. Please install Pillow: pip install Pillow")
        return False
    except Exception as e:
        print(f"❌ Error creating test image: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🚀 DeepFace Emotion Detection API Test Suite")
    print(f"🌐 Testing API at: {BASE_URL}")
    print("="*60)
    
    # Check if API is running
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to API at {BASE_URL}")
        print(f"Error: {str(e)}")
        print("\n💡 Make sure the API is running:")
        print("   python app.py")
        print("   or")
        print("   gunicorn app:app")
        return
    
    # Create test image if needed
    if not os.path.exists(TEST_IMAGE_PATH):
        print("📸 Creating test image...")
        if not create_sample_image():
            print("❌ Cannot create test image. Please provide a test image manually.")
            TEST_IMAGE_PATH = input("Enter path to test image: ").strip()
            if not os.path.exists(TEST_IMAGE_PATH):
                print("❌ No test image available. Skipping emotion analysis tests.")
                TEST_IMAGE_PATH = None
    
    # Run tests
    tests = [
        ("Health Check", test_health_check),
        ("API Info", test_api_info),
        ("System Info", test_system_info),
    ]
    
    if TEST_IMAGE_PATH:
        tests.extend([
            ("Emotion Analysis", test_emotion_analysis),
            ("Performance Test", test_performance),
        ])
    
    tests.append(("Error Cases", test_error_cases))
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed: {str(e)}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "="*60)
    print("📊 Test Results Summary:")
    print("="*60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the logs above for details.")
    
    # Cleanup
    if os.path.exists(TEST_IMAGE_PATH) and TEST_IMAGE_PATH == 'test_image.jpg':
        try:
            os.remove(TEST_IMAGE_PATH)
            print(f"🧹 Cleaned up test image: {TEST_IMAGE_PATH}")
        except:
            pass

if __name__ == "__main__":
    main()
