#!/usr/bin/env python3
"""
Backend API Testing for Multi-Platform Chat Aggregation
Tests all API endpoints and WebSocket functionality
"""

import requests
import json
import asyncio
import websockets
import time
from datetime import datetime
import sys

# Get backend URL from frontend .env
BACKEND_URL = "https://streamchat-unified.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
WS_URL = f"wss://streamchat-unified.preview.emergentagent.com/ws"

class ChatAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })
        
    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint health check"""
        try:
            response = self.session.get(f"{API_BASE}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Root Endpoint", True, f"Health check passed: {data['message']}", data)
                else:
                    self.log_test("Root Endpoint", False, "Response missing 'message' field", data)
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Request failed: {str(e)}")
    
    def test_get_all_messages(self):
        """Test GET /api/messages - Fetch all chat messages"""
        try:
            response = self.session.get(f"{API_BASE}/messages", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    message_count = len(data)
                    self.log_test("Get All Messages", True, f"Retrieved {message_count} messages", {"count": message_count})
                    
                    # Validate message structure if messages exist
                    if message_count > 0:
                        sample_msg = data[0]
                        required_fields = ["id", "platform", "username", "message", "timestamp"]
                        missing_fields = [field for field in required_fields if field not in sample_msg]
                        
                        if missing_fields:
                            self.log_test("Message Structure", False, f"Missing fields: {missing_fields}", sample_msg)
                        else:
                            self.log_test("Message Structure", True, "All required fields present", sample_msg)
                else:
                    self.log_test("Get All Messages", False, "Response is not a list", data)
            else:
                self.log_test("Get All Messages", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get All Messages", False, f"Request failed: {str(e)}")
    
    def test_platform_filtering(self):
        """Test GET /api/messages/{platform} - Filter messages by platform"""
        platforms = ["youtube", "twitch", "kick"]
        
        for platform in platforms:
            try:
                response = self.session.get(f"{API_BASE}/messages/{platform}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        # Check if all messages are from the requested platform
                        platform_messages = [msg for msg in data if msg.get("platform") == platform]
                        total_messages = len(data)
                        correct_platform = len(platform_messages)
                        
                        if total_messages == correct_platform:
                            self.log_test(f"Platform Filter ({platform})", True, 
                                        f"Retrieved {total_messages} {platform} messages", 
                                        {"platform": platform, "count": total_messages})
                        else:
                            self.log_test(f"Platform Filter ({platform})", False, 
                                        f"Filter failed: {correct_platform}/{total_messages} messages from {platform}")
                    else:
                        self.log_test(f"Platform Filter ({platform})", False, "Response is not a list", data)
                else:
                    self.log_test(f"Platform Filter ({platform})", False, f"HTTP {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_test(f"Platform Filter ({platform})", False, f"Request failed: {str(e)}")
    
    def test_create_message(self):
        """Test POST /api/messages - Create new chat message"""
        test_message = {
            "platform": "youtube",
            "username": "TestUser",
            "message": "Test message from API test",
            "user_color": "#FF5733",
            "is_moderator": True,
            "is_subscriber": False
        }
        
        try:
            response = self.session.post(f"{API_BASE}/messages", 
                                       json=test_message, 
                                       timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify the created message has all expected fields
                required_fields = ["id", "platform", "username", "message", "timestamp"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Create Message", False, f"Missing fields in response: {missing_fields}", data)
                else:
                    # Verify the data matches what we sent
                    if (data["platform"] == test_message["platform"] and 
                        data["username"] == test_message["username"] and
                        data["message"] == test_message["message"]):
                        self.log_test("Create Message", True, "Message created successfully", data)
                        return data["id"]  # Return ID for potential cleanup
                    else:
                        self.log_test("Create Message", False, "Response data doesn't match input", data)
            else:
                self.log_test("Create Message", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create Message", False, f"Request failed: {str(e)}")
        
        return None
    
    def test_clear_messages(self):
        """Test DELETE /api/messages - Clear all messages"""
        try:
            response = self.session.delete(f"{API_BASE}/messages", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "deleted_count" in data:
                    deleted_count = data["deleted_count"]
                    self.log_test("Clear Messages", True, f"Deleted {deleted_count} messages", data)
                else:
                    self.log_test("Clear Messages", False, "Response missing 'deleted_count' field", data)
            else:
                self.log_test("Clear Messages", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Clear Messages", False, f"Request failed: {str(e)}")
    
    async def test_websocket_connection(self):
        """Test WebSocket /ws - Test WebSocket connection and message broadcasting"""
        try:
            # Test WebSocket connection
            async with websockets.connect(WS_URL) as websocket:
                self.log_test("WebSocket Connection", True, "Successfully connected to WebSocket")
                
                # Wait for a message (should receive mock messages)
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=15)
                    data = json.loads(message)
                    
                    if "type" in data and "data" in data:
                        if data["type"] == "new_message":
                            self.log_test("WebSocket Message Receive", True, 
                                        "Received real-time message broadcast", data)
                        else:
                            self.log_test("WebSocket Message Receive", False, 
                                        f"Unexpected message type: {data['type']}", data)
                    else:
                        self.log_test("WebSocket Message Receive", False, 
                                    f"Message missing required fields. Received: {data}", data)
                        
                except asyncio.TimeoutError:
                    self.log_test("WebSocket Message Receive", False, 
                                "No messages received within 15 seconds (mock generation may be slow)")
                
        except Exception as e:
            self.log_test("WebSocket Connection", False, f"WebSocket connection failed: {str(e)}")
    
    def test_cors_headers(self):
        """Test CORS headers are working"""
        try:
            # Test with GET request to see CORS headers
            response = self.session.get(f"{API_BASE}/messages", timeout=10)
            
            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
                "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers")
            }
            
            if cors_headers["Access-Control-Allow-Origin"]:
                self.log_test("CORS Headers", True, "CORS headers present", cors_headers)
            else:
                # Try OPTIONS request as fallback
                options_response = self.session.options(f"{API_BASE}/messages", timeout=10)
                options_cors = {
                    "Access-Control-Allow-Origin": options_response.headers.get("Access-Control-Allow-Origin"),
                    "Access-Control-Allow-Methods": options_response.headers.get("Access-Control-Allow-Methods"),
                    "Access-Control-Allow-Headers": options_response.headers.get("Access-Control-Allow-Headers")
                }
                
                if options_cors["Access-Control-Allow-Origin"]:
                    self.log_test("CORS Headers", True, "CORS headers present (OPTIONS)", options_cors)
                else:
                    self.log_test("CORS Headers", False, f"CORS headers missing. GET headers: {cors_headers}, OPTIONS headers: {options_cors}")
                
        except Exception as e:
            self.log_test("CORS Headers", False, f"CORS test failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Backend API Tests for: {BACKEND_URL}")
        print("=" * 60)
        
        # Test API endpoints
        self.test_root_endpoint()
        self.test_get_all_messages()
        self.test_platform_filtering()
        self.test_create_message()
        self.test_cors_headers()
        
        # Test WebSocket (async)
        print("\n🔌 Testing WebSocket Connection...")
        asyncio.run(self.test_websocket_connection())
        
        # Test clear messages last (destructive operation)
        print("\n🗑️  Testing Clear Messages (Destructive)...")
        self.test_clear_messages()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = ChatAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed!")
        sys.exit(1)