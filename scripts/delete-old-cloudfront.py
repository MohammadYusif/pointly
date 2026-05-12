import subprocess, json, time, os, tempfile

def disable_and_delete(dist_id):
    print(f"\n=== Processing {dist_id} ===")
    
    # Get config
    result = subprocess.run(['aws', 'cloudfront', 'get-distribution-config', '--id', dist_id, '--output', 'json'], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Failed to get config: {result.stderr}")
        return
    data = json.loads(result.stdout)
    config = data['DistributionConfig']
    etag = data['ETag']
    
    if config['Enabled']:
        config['Enabled'] = False
        result = subprocess.run(['aws', 'cloudfront', 'update-distribution', '--id', dist_id, '--distribution-config', json.dumps(config), '--if-match', etag], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Failed to disable {dist_id}: {result.stderr}")
            return
        print(f"Disabled {dist_id}, waiting for propagation...")
    
    # Wait for propagation (up to 5 minutes)
    for i in range(30):
        time.sleep(10)
        result = subprocess.run(['aws', 'cloudfront', 'get-distribution', '--id', dist_id, '--output', 'json'], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Failed to check status: {result.stderr}")
            return
        data = json.loads(result.stdout)
        if not data['Distribution']['DistributionConfig']['Enabled']:
            etag2 = data['ETag']
            result = subprocess.run(['aws', 'cloudfront', 'delete-distribution', '--id', dist_id, '--if-match', etag2], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"Deleted {dist_id}")
            else:
                print(f"Failed to delete {dist_id}: {result.stderr}")
            return
        if i % 3 == 0:
            print(f"  Still propagating... ({i*10}s)")
    
    print(f"Timeout waiting for {dist_id}")

for dist_id in ['E2ZSJ88P7O7AKO', 'ENILGFVBZ6SSX', 'E1VCE01IMGWOBM']:
    disable_and_delete(dist_id)

print("\n=== Done ===")
