import urllib.request
import json
try:
    url = "http://ip-api.com/json/8.8.8.8"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=3) as response:
        data = json.loads(response.read().decode())
        print(data)
except Exception as e:
    print(e)
