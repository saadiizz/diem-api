
module.exports.wepayUserSchema = {
  "id": "/UserSchema",
  "type": "object",  
  "properties": {
    "email": {"type": "email"},
    "scope": {"type": "string"},
    "first_name": {"type": "string"},
    "last_name": {"type": "string"},
    "original_ip": {"type": "string"},
    "original_device": {"type": "string"},
    "tos_acceptance_time": {"type": "string"}
  },
  
  "required": ["email", "scope", "first_name", "last_name", "original_ip", "original_device", "tos_acceptance_time"]
}