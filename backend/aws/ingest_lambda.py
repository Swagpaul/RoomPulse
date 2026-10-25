import json
import os
import boto3
from datetime import datetime

# Environment variables
TABLE_NAME = os.environ.get('DYNAMODB_TABLE', 'RoomPulseEvents')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    """
    AWS Lambda handler triggered by AWS IoT Core Rule
    Rule SQL: SELECT * FROM 'roompulse/+/motion'
    
    Normalizes uptime device timestamp to UTC ISO 8601 server wall-clock time
    per cloud.md specification.
    """
    print("Received MQTT payload:", json.dumps(event))
    
    room_id = event.get('room_id', 'room238')
    # Reconcile room 301 vs room238 prefix if needed
    if not str(room_id).startswith('room'):
        room_id = f"room{room_id}"
        
    motion_event = event.get('event', 'motion_detected')
    device_timestamp_ms = event.get('timestamp_ms', None)
    duration_ms = event.get('duration_ms', None)
    
    # ISO 8601 UTC server timestamp
    server_timestamp = datetime.utcnow().isoformat() + "Z"
    
    item = {
        'room_id': room_id,
        'timestamp': server_timestamp,
        'event': motion_event,
        'device_timestamp_ms': device_timestamp_ms
    }
    
    if duration_ms is not None:
        item['duration_ms'] = int(duration_ms)
        
    # Write to DynamoDB
    table.put_item(Item=item)
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Event ingested successfully', 'item': item})
    }
