
export class TrackClient {
  static async toggleLike(trackId: string): Promise<boolean> {
    try {

      const response = await fetch(`/api/track/${trackId}/toggle-like`, {
        method: 'POST'
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();


      return data.success;
    } catch (error) {
      return false;
    }
  }

  static async saveToPlaylist(trackId: string, playlistId: string): Promise<boolean> {
    try {

      const response = await fetch(`/api/track/${trackId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      return data.success;
    } catch (error) {
      return false;
    }
  }

  static async removeFromPlaylist(playlistTrackId: string): Promise<boolean> {
    try {

      const response = await fetch(`/api/track/remove-from-playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistTrackId })
      });

      if (!response.ok) {
        
        return false;
      }

      const data = await response.json();

      return data.success;
    } catch (error) {
      return false;
    }
  }
}