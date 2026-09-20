"""
NetPulse Capture Engine — API Client
Pushes live data to the Node.js API server
"""
import requests
import logging
import config

logger = logging.getLogger('netpulse.api')


class APIClient:
    """Sends aggregated data and anomalies to the Node.js API server."""

    def __init__(self):
        self._base_url = config.API_BASE_URL
        self._ingest_url = config.API_INGEST_ENDPOINT
        self._session = requests.Session()
        self._session.headers.update({
            'Content-Type': 'application/json',
        })

    def push_data(self, aggregated_data, anomalies=None):
        """
        Push aggregated data to the API server.
        The server will broadcast it via WebSocket to connected dashboards.
        """
        try:
            payload = {
                'packets': aggregated_data.get('packets', [])[-20:],  # Last 20 packets
                'flows': aggregated_data.get('flows', [])[:50],  # Top 50 flows
                'stats': {
                    'bandwidth': aggregated_data.get('bandwidth', {}),
                    'protocols': aggregated_data.get('protocols', []),
                    'devices': aggregated_data.get('devices', []),
                    'summary': aggregated_data.get('summary', {}),
                },
                'anomalies': anomalies or [],
            }

            response = self._session.post(
                self._ingest_url,
                json=payload,
                timeout=5,
            )

            if response.status_code == 200:
                result = response.json()
                logger.debug(f'Data pushed to API: {result.get("ingested", {})}')
                return True
            else:
                logger.warning(f'API push failed with status {response.status_code}: {response.text}')
                return False

        except requests.ConnectionError:
            logger.warning('Cannot connect to API server. Is it running?')
            return False
        except requests.Timeout:
            logger.warning('API push timed out')
            return False
        except Exception as e:
            logger.error(f'Error pushing data to API: {e}')
            return False

    def health_check(self):
        """Check if the API server is reachable."""
        try:
            response = self._session.get(
                f'{self._base_url}/api/health',
                timeout=3,
            )
            return response.status_code == 200
        except Exception:
            return False
