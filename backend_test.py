#!/usr/bin/env python3
"""
ResQFly Backend API Test Suite
Tests all core backend functionality for the disaster response drone system
"""

import asyncio
import json
import requests
import websockets
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

# Configuration
BACKEND_URL = "https://skyhelper.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class ResQFlyTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {}
        self.created_resources = {"drones": [], "missions": []}
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results[test_name] = {"success": success, "details": details}
        
    def test_health_check(self):
        """Test GET /api/health endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["status", "timestamp", "ai_enabled", "mavlink_pps", "connected_clients"]
                
                if all(field in data for field in required_fields):
                    if data["status"] == "healthy":
                        self.log_test("Health Check", True, f"Status: {data['status']}, AI: {data['ai_enabled']}")
                        return True
                    else:
                        self.log_test("Health Check", False, f"Unhealthy status: {data['status']}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Health Check", False, f"Missing fields: {missing}")
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
        return False
        
    def test_get_drones(self):
        """Test GET /api/drones endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/drones", timeout=10)
            
            if response.status_code == 200:
                drones = response.json()
                
                if isinstance(drones, list):
                    # Check if default drone "ResQ-Alpha" exists
                    resq_alpha = next((d for d in drones if d.get("callsign") == "ResQ-Alpha"), None)
                    
                    if resq_alpha:
                        required_fields = ["id", "uid", "callsign", "firmware", "status"]
                        if all(field in resq_alpha for field in required_fields):
                            self.log_test("Get Drones", True, f"Found {len(drones)} drones, ResQ-Alpha present")
                            return True
                        else:
                            missing = [f for f in required_fields if f not in resq_alpha]
                            self.log_test("Get Drones", False, f"ResQ-Alpha missing fields: {missing}")
                    else:
                        self.log_test("Get Drones", False, "Default drone 'ResQ-Alpha' not found")
                else:
                    self.log_test("Get Drones", False, f"Expected list, got {type(drones)}")
            else:
                self.log_test("Get Drones", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Drones", False, f"Exception: {str(e)}")
        return False
        
    def test_create_drone(self):
        """Test POST /api/drones endpoint"""
        try:
            test_drone = {
                "uid": f"test_drone_{uuid.uuid4().hex[:8]}",
                "callsign": "Test-Bravo",
                "firmware": "ArduPilot 4.3.0",
                "max_payload_kg": 3.5,
                "status": "offline"
            }
            
            response = self.session.post(
                f"{API_BASE}/drones", 
                json=test_drone,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                created_drone = response.json()
                
                # Verify all fields are present
                if all(key in created_drone for key in test_drone.keys()):
                    if "id" in created_drone and "created_at" in created_drone:
                        self.created_resources["drones"].append(created_drone["id"])
                        self.log_test("Create Drone", True, f"Created drone: {created_drone['callsign']}")
                        return True
                    else:
                        self.log_test("Create Drone", False, "Missing id or created_at in response")
                else:
                    self.log_test("Create Drone", False, "Response missing required fields")
            else:
                self.log_test("Create Drone", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create Drone", False, f"Exception: {str(e)}")
        return False
        
    def test_get_missions(self):
        """Test GET /api/missions endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/missions", timeout=10)
            
            if response.status_code == 200:
                missions = response.json()
                
                if isinstance(missions, list):
                    self.log_test("Get Missions", True, f"Retrieved {len(missions)} missions")
                    return True
                else:
                    self.log_test("Get Missions", False, f"Expected list, got {type(missions)}")
            else:
                self.log_test("Get Missions", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Get Missions", False, f"Exception: {str(e)}")
        return False
        
    def test_create_mission(self):
        """Test POST /api/missions endpoint"""
        try:
            test_mission = {
                "code": f"RESCUE-{uuid.uuid4().hex[:6].upper()}",
                "created_by": "test_operator",
                "status": "planned",
                "priority": 3,
                "origin": {"lat": 37.7749, "lon": -122.4194, "alt": 100},
                "destination": {"lat": 37.7849, "lon": -122.4094, "alt": 50},
                "geofence_ids": [],
                "payloads": ["medical_kit", "emergency_beacon"]
            }
            
            response = self.session.post(
                f"{API_BASE}/missions",
                json=test_mission,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                created_mission = response.json()
                
                # Verify all fields are present
                if all(key in created_mission for key in test_mission.keys()):
                    if "id" in created_mission and "created_at" in created_mission:
                        self.created_resources["missions"].append(created_mission["id"])
                        self.log_test("Create Mission", True, f"Created mission: {created_mission['code']}")
                        return True
                    else:
                        self.log_test("Create Mission", False, "Missing id or created_at in response")
                else:
                    self.log_test("Create Mission", False, "Response missing required fields")
            else:
                self.log_test("Create Mission", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Create Mission", False, f"Exception: {str(e)}")
        return False
        
    def test_ai_settings(self):
        """Test GET /api/ai/settings endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/ai/settings", timeout=10)
            
            if response.status_code == 200:
                settings = response.json()
                
                required_fields = ["enabled", "provider"]
                if all(field in settings for field in required_fields):
                    # AI should be OFF by default
                    if settings["enabled"] == False:
                        self.log_test("AI Settings", True, f"AI disabled by default, provider: {settings['provider']}")
                        return True
                    else:
                        self.log_test("AI Settings", False, f"AI should be disabled by default, got: {settings['enabled']}")
                else:
                    missing = [f for f in required_fields if f not in settings]
                    self.log_test("AI Settings", False, f"Missing fields: {missing}")
            else:
                self.log_test("AI Settings", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("AI Settings", False, f"Exception: {str(e)}")
        return False
        
    def test_safety_score(self):
        """Test POST /api/telemetry/safety-score endpoint"""
        try:
            # First, we need a drone with telemetry data
            # Let's try with the default drone
            drone_id = "drone_001"  # This should be the default drone's ID
            
            response = self.session.post(
                f"{API_BASE}/telemetry/safety-score",
                params={"drone_id": drone_id},
                timeout=10
            )
            
            if response.status_code == 200:
                score_data = response.json()
                
                required_fields = ["score", "factors", "recommendations", "timestamp"]
                if all(field in score_data for field in required_fields):
                    score = score_data["score"]
                    if isinstance(score, (int, float)) and 0 <= score <= 100:
                        factors = score_data["factors"]
                        expected_factors = ["gps_quality", "battery_level", "altitude_safety", "attitude_stability", "link_quality"]
                        
                        if all(factor in factors for factor in expected_factors):
                            self.log_test("Safety Score", True, f"Score: {score}, Factors: {len(factors)}")
                            return True
                        else:
                            missing = [f for f in expected_factors if f not in factors]
                            self.log_test("Safety Score", False, f"Missing factors: {missing}")
                    else:
                        self.log_test("Safety Score", False, f"Invalid score value: {score}")
                else:
                    missing = [f for f in required_fields if f not in score_data]
                    self.log_test("Safety Score", False, f"Missing fields: {missing}")
            elif response.status_code == 404:
                self.log_test("Safety Score", False, "No telemetry data found - MAVLink listener may not be working")
            else:
                self.log_test("Safety Score", False, f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Safety Score", False, f"Exception: {str(e)}")
        return False
        
    async def test_websocket_connection(self):
        """Test WebSocket connection at /api/telemetry"""
        try:
            ws_url = f"{BACKEND_URL.replace('https://', 'wss://')}/api/telemetry"
            
            async with websockets.connect(ws_url) as websocket:
                # Wait for initial connection message
                message = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(message)
                
                if data.get("type") == "connection" and "client_id" in data:
                    self.log_test("WebSocket Connection", True, f"Connected with client_id: {data['client_id']}")
                    return True
                else:
                    self.log_test("WebSocket Connection", False, f"Unexpected initial message: {data}")
                    
        except asyncio.TimeoutError:
            self.log_test("WebSocket Connection", False, "Connection timeout")
        except Exception as e:
            self.log_test("WebSocket Connection", False, f"Exception: {str(e)}")
        return False
        
    def test_database_connectivity(self):
        """Test if MongoDB is working by checking if we can retrieve data"""
        try:
            # Test by trying to get drones (which requires DB connection)
            response = self.session.get(f"{API_BASE}/drones", timeout=5)
            
            if response.status_code == 200:
                self.log_test("Database Connectivity", True, "MongoDB connection working")
                return True
            else:
                self.log_test("Database Connectivity", False, f"DB connection issue: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Database Connectivity", False, f"Exception: {str(e)}")
        return False
        
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚁 ResQFly Backend API Test Suite")
        print("=" * 50)
        
        # Test order based on dependencies
        tests = [
            ("Database Connectivity", self.test_database_connectivity),
            ("Health Check", self.test_health_check),
            ("Get Drones", self.test_get_drones),
            ("Create Drone", self.test_create_drone),
            ("Get Missions", self.test_get_missions),
            ("Create Mission", self.test_create_mission),
            ("AI Settings", self.test_ai_settings),
            ("Safety Score", self.test_safety_score),
        ]
        
        results = {}
        for test_name, test_func in tests:
            print(f"\n🔍 Testing {test_name}...")
            results[test_name] = test_func()
            
        # Test WebSocket separately (async)
        print(f"\n🔍 Testing WebSocket Connection...")
        try:
            ws_result = asyncio.run(self.test_websocket_connection())
            results["WebSocket Connection"] = ws_result
        except Exception as e:
            self.log_test("WebSocket Connection", False, f"Async test failed: {str(e)}")
            results["WebSocket Connection"] = False
            
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for success in results.values() if success)
        total = len(results)
        
        for test_name, success in results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {test_name}")
            
        print(f"\n🎯 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All tests passed! ResQFly backend is fully operational.")
        else:
            failed_tests = [name for name, success in results.items() if not success]
            print(f"⚠️  Failed tests: {', '.join(failed_tests)}")
            
        return results

def main():
    """Main test execution"""
    tester = ResQFlyTester()
    results = tester.run_all_tests()
    
    # Return exit code based on results
    all_passed = all(results.values())
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())