import asyncio
import httpx

async def fetch_hospitals():
    lat, lng, radius = 13.0827, 80.2707, 10000
    query = f"""
    [out:json][timeout:5];
    (
      node["amenity"="hospital"](around:{radius},{lat},{lng});
      way["amenity"="hospital"](around:{radius},{lat},{lng});
      relation["amenity"="hospital"](around:{radius},{lat},{lng});
    );
    out center body;
    """
    try:
        headers = {'User-Agent': 'RoadSoS_Emergency_App/1.0 (contact@roadsos.test)'}
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post('https://overpass-api.de/api/interpreter', data={'data': query}, headers=headers)
            print(resp.status_code)
            if resp.status_code != 200:
                print(resp.text[:500])
            else:
                print("Success, got", len(resp.json().get('elements', [])), "elements")
    except Exception as e:
        print('Error:', e)

if __name__ == '__main__':
    asyncio.run(fetch_hospitals())
