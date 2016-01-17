# Spotify events

This document describes the upnp events that are triggered for specific operations.

1. Play
2. Pause
3. Continue
4. Skip
5. Prev
6. Seek
7. Another Track

## 1. Play

### Event
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<LastChange>&lt;Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/"&gt;&lt;InstanceID val="0"&gt;&lt;AVTransportURIMetaData val="&amp;lt;DIDL-Lite 
  xmlns=&amp;quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&amp;quot; 
  xmlns:raumfeld=&amp;quot;urn:schemas-raumfeld-com:meta-data/raumfeld&amp;quot; 
  xmlns:upnp=&amp;quot;urn:schemas-upnp-org:metadata-1-0/upnp/&amp;quot; 
  xmlns:dc=&amp;quot;http://purl.org/dc/elements/1.1/&amp;quot; 
  xmlns:dlna=&amp;quot;urn:schemas-dlna-org:metadata-1-0/&amp;quot;&amp;gt;&amp;lt;item&amp;gt;&amp;lt;upnp:class&amp;gt;object.item.audioItem.musicTrack&amp;lt;/upnp:class&amp;gt;&amp;lt;raumfeld:section&amp;gt;Spotify&amp;lt;/raumfeld:section&amp;gt;&amp;lt;dc:title&amp;gt;Lightest Shades of Grey&amp;lt;/dc:title&amp;gt;&amp;lt;upnp:artist&amp;gt;Solar&amp;lt;/upnp:artist&amp;gt;&amp;lt;upnp:album&amp;gt;Fiev&amp;lt;/upnp:album&amp;gt;&amp;lt;upnp:albumArtURI dlna:profileID=&amp;quot;JPEG_TN&amp;quot;&amp;gt;http://o.scdn.co/320/3159c9108028011d7b036bc168f1a671181ba85e&amp;lt;/upnp:albumArtURI&amp;gt;&amp;lt;res duration=&amp;quot;0:06:56.000&amp;quot; protocolInfo=&amp;quot;spotify:*:audio/spotify-track:*&amp;quot;&amp;gt;spotify:track:5s4CNOUJjhwRSigF80oN0f&amp;lt;/res&amp;gt;&amp;lt;/item&amp;gt;&amp;lt;/DIDL-Lite&amp;gt;"/&gt;&lt;TransportStatus val="OK"/&gt;&lt;CurrentTrackDuration val="0:06:56"/&gt;&lt;AVTransportURI val="spotify://playback"/&gt;&lt;TransportState val="PLAYING"/&gt;&lt;CurrentPlayMode val="RANDOM"/&gt;&lt;CurrentTransportActions val="Pause,Seek,Next,Previous,Shuffle,Repeat"/&gt;&lt;/InstanceID&gt;&lt;/Event&gt;
</LastChange>
```

## Change
```
<Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/">
  <InstanceID val="0">
    <AVTransportURIMetaData val="&lt;DIDL-Lite 
      xmlns=&quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&quot; 
      xmlns:raumfeld=&quot;urn:schemas-raumfeld-com:meta-data/raumfeld&quot; 
      xmlns:upnp=&quot;urn:schemas-upnp-org:metadata-1-0/upnp/&quot; 
      xmlns:dc=&quot;http://purl.org/dc/elements/1.1/&quot; 
      xmlns:dlna=&quot;urn:schemas-dlna-org:metadata-1-0/&quot;&gt;&lt;item&gt;&lt;upnp:class&gt;object.item.audioItem.musicTrack&lt;/upnp:class&gt;&lt;raumfeld:section&gt;Spotify&lt;/raumfeld:section&gt;&lt;dc:title&gt;Lightest Shades of Grey&lt;/dc:title&gt;&lt;upnp:artist&gt;Solar&lt;/upnp:artist&gt;&lt;upnp:album&gt;Fiev&lt;/upnp:album&gt;&lt;upnp:albumArtURI dlna:profileID=&quot;JPEG_TN&quot;&gt;http://o.scdn.co/320/3159c9108028011d7b036bc168f1a671181ba85e&lt;/upnp:albumArtURI&gt;&lt;res duration=&quot;0:06:56.000&quot; protocolInfo=&quot;spotify:*:audio/spotify-track:*&quot;&gt;spotify:track:5s4CNOUJjhwRSigF80oN0f&lt;/res&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;"/>
      <TransportStatus val="OK"/>
      <CurrentTrackDuration val="0:06:56"/>
      <AVTransportURI val="spotify://playback"/>
      <TransportState val="PLAYING"/>
      <CurrentPlayMode val="RANDOM"/>
      <CurrentTransportActions val="Pause,Seek,Next,Previous,Shuffle,Repeat"/>
    </InstanceID>
  </Event>
```

## AVTransportURIMetaData
```
<DIDL-Lite 
  xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" 
  xmlns:raumfeld="urn:schemas-raumfeld-com:meta-data/raumfeld" 
  xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" 
  xmlns:dc="http://purl.org/dc/elements/1.1/" 
  xmlns:dlna="urn:schemas-dlna-org:metadata-1-0/">
  <item>
    <upnp:class>object.item.audioItem.musicTrack</upnp:class>
    <raumfeld:section>Spotify</raumfeld:section>
    <dc:title>Lightest Shades of Grey</dc:title>
    <upnp:artist>Solar</upnp:artist>
    <upnp:album>Fiev</upnp:album>
    <upnp:albumArtURI dlna:profileID="JPEG_TN">http://o.scdn.co/320/3159c9108028011d7b036bc168f1a671181ba85e</upnp:albumArtURI>
    <res duration="0:06:56.000" protocolInfo="spotify:*:audio/spotify-track:*">spotify:track:5s4CNOUJjhwRSigF80oN0f</res>
  </item>
</DIDL-Lite>
```

# 2. Pause

## Event
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<LastChange>&lt;Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/"&gt;&lt;InstanceID val="0"&gt;&lt;TransportState val="PAUSED_PLAYBACK"/&gt;&lt;CurrentTransportActions val="Play,Seek,Next,Previous,Shuffle,Repeat"/&gt;&lt;/InstanceID&gt;&lt;/Event&gt;
</LastChange>
```

## Change
```
<Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/">
  <InstanceID val="0">
    <TransportState val="PAUSED_PLAYBACK"/>
    <CurrentTransportActions val="Play,Seek,Next,Previous,Shuffle,Repeat"/>
  </InstanceID>
</Event>
```

# 3. Continue

## Event
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<LastChange>&lt;Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/"&gt;&lt;InstanceID val="0"&gt;&lt;TransportState val="PLAYING"/&gt;&lt;CurrentTransportActions val="Pause,Seek,Next,Previous,Shuffle,Repeat"/&gt;&lt;/InstanceID&gt;&lt;/Event&gt;
</LastChange>
```

## Change
```
<Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/">
  <InstanceID val="0">
    <TransportState val="PLAYING"/>
    <CurrentTransportActions val="Pause,Seek,Next,Previous,Shuffle,Repeat"/>
  </InstanceID>
</Event>
```

# 4. Skip

### Event (1)
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<LastChange>&lt;Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/"&gt;&lt;InstanceID val="0"&gt;&lt;AVTransportURIMetaData val="&amp;lt;DIDL-Lite 
  xmlns=&amp;quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&amp;quot; 
  xmlns:raumfeld=&amp;quot;urn:schemas-raumfeld-com:meta-data/raumfeld&amp;quot; 
  xmlns:upnp=&amp;quot;urn:schemas-upnp-org:metadata-1-0/upnp/&amp;quot; 
  xmlns:dc=&amp;quot;http://purl.org/dc/elements/1.1/&amp;quot; 
  xmlns:dlna=&amp;quot;urn:schemas-dlna-org:metadata-1-0/&amp;quot;&amp;gt;&amp;lt;item&amp;gt;&amp;lt;upnp:class&amp;gt;object.item.audioItem.musicTrack&amp;lt;/upnp:class&amp;gt;&amp;lt;raumfeld:section&amp;gt;Spotify&amp;lt;/raumfeld:section&amp;gt;&amp;lt;dc:title&amp;gt;Fantasy - Pomo Remix&amp;lt;/dc:title&amp;gt;&amp;lt;upnp:artist&amp;gt;Alina Baraz&amp;lt;/upnp:artist&amp;gt;&amp;lt;upnp:album&amp;gt;Fantasy (Remixes)&amp;lt;/upnp:album&amp;gt;&amp;lt;upnp:albumArtURI dlna:profileID=&amp;quot;JPEG_TN&amp;quot;&amp;gt;http://o.scdn.co/320/b59ef265278485d108f532f65f030b66332d5ebf&amp;lt;/upnp:albumArtURI&amp;gt;&amp;lt;res duration=&amp;quot;0:02:56.000&amp;quot; protocolInfo=&amp;quot;spotify:*:audio/spotify-track:*&amp;quot;&amp;gt;spotify:track:7GshgHF0dXOLl4l3c010e4&amp;lt;/res&amp;gt;&amp;lt;/item&amp;gt;&amp;lt;/DIDL-Lite&amp;gt;"/&gt;&lt;CurrentTrackDuration val="0:02:56"/&gt;&lt;/InstanceID&gt;&lt;/Event&gt;
</LastChange>
```

## Change (1)
```
<Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/">
  <InstanceID val="0">
    <AVTransportURIMetaData val="&lt;DIDL-Lite 
      xmlns=&quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&quot; 
      xmlns:raumfeld=&quot;urn:schemas-raumfeld-com:meta-data/raumfeld&quot; 
      xmlns:upnp=&quot;urn:schemas-upnp-org:metadata-1-0/upnp/&quot; 
      xmlns:dc=&quot;http://purl.org/dc/elements/1.1/&quot; 
      xmlns:dlna=&quot;urn:schemas-dlna-org:metadata-1-0/&quot;&gt;&lt;item&gt;&lt;upnp:class&gt;object.item.audioItem.musicTrack&lt;/upnp:class&gt;&lt;raumfeld:section&gt;Spotify&lt;/raumfeld:section&gt;&lt;dc:title&gt;Fantasy - Pomo Remix&lt;/dc:title&gt;&lt;upnp:artist&gt;Alina Baraz&lt;/upnp:artist&gt;&lt;upnp:album&gt;Fantasy (Remixes)&lt;/upnp:album&gt;&lt;upnp:albumArtURI dlna:profileID=&quot;JPEG_TN&quot;&gt;http://o.scdn.co/320/b59ef265278485d108f532f65f030b66332d5ebf&lt;/upnp:albumArtURI&gt;&lt;res duration=&quot;0:02:56.000&quot; protocolInfo=&quot;spotify:*:audio/spotify-track:*&quot;&gt;spotify:track:7GshgHF0dXOLl4l3c010e4&lt;/res&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;"/>
      <CurrentTrackDuration val="0:02:56"/>
    </InstanceID>
  </Event>
```

## AVTransportURIMetaData (1)
```
<DIDL-Lite 
  xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" 
  xmlns:raumfeld="urn:schemas-raumfeld-com:meta-data/raumfeld" 
  xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" 
  xmlns:dc="http://purl.org/dc/elements/1.1/" 
  xmlns:dlna="urn:schemas-dlna-org:metadata-1-0/">
  <item>
    <upnp:class>object.item.audioItem.musicTrack</upnp:class>
    <raumfeld:section>Spotify</raumfeld:section>
    <dc:title>Fantasy - Pomo Remix</dc:title>
    <upnp:artist>Alina Baraz</upnp:artist>
    <upnp:album>Fantasy (Remixes)</upnp:album>
    <upnp:albumArtURI dlna:profileID="JPEG_TN">http://o.scdn.co/320/b59ef265278485d108f532f65f030b66332d5ebf</upnp:albumArtURI>
    <res duration="0:02:56.000" protocolInfo="spotify:*:audio/spotify-track:*">spotify:track:7GshgHF0dXOLl4l3c010e4</res>
  </item>
</DIDL-Lite>
```

### Event (2)
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<BufferFilled>-1970113297</BufferFilled>
```

# 5. Prev

### Event (1)
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<LastChange>&lt;Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/"&gt;&lt;InstanceID val="0"&gt;&lt;AVTransportURIMetaData val="&amp;lt;DIDL-Lite 
  xmlns=&amp;quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&amp;quot; 
  xmlns:raumfeld=&amp;quot;urn:schemas-raumfeld-com:meta-data/raumfeld&amp;quot; 
  xmlns:upnp=&amp;quot;urn:schemas-upnp-org:metadata-1-0/upnp/&amp;quot; 
  xmlns:dc=&amp;quot;http://purl.org/dc/elements/1.1/&amp;quot; 
  xmlns:dlna=&amp;quot;urn:schemas-dlna-org:metadata-1-0/&amp;quot;&amp;gt;&amp;lt;item&amp;gt;&amp;lt;upnp:class&amp;gt;object.item.audioItem.musicTrack&amp;lt;/upnp:class&amp;gt;&amp;lt;raumfeld:section&amp;gt;Spotify&amp;lt;/raumfeld:section&amp;gt;&amp;lt;dc:title&amp;gt;Curtains&amp;lt;/dc:title&amp;gt;&amp;lt;upnp:artist&amp;gt;Last Lynx&amp;lt;/upnp:artist&amp;gt;&amp;lt;upnp:album&amp;gt;Rifts EP&amp;lt;/upnp:album&amp;gt;&amp;lt;upnp:albumArtURI dlna:profileID=&amp;quot;JPEG_TN&amp;quot;&amp;gt;http://o.scdn.co/320/ade91d80d93dc88cfe1bb2decde2a6635320b391&amp;lt;/upnp:albumArtURI&amp;gt;&amp;lt;res duration=&amp;quot;0:03:22.000&amp;quot; protocolInfo=&amp;quot;spotify:*:audio/spotify-track:*&amp;quot;&amp;gt;spotify:track:6tLjF5JaRLlk5A8CPgy3W4&amp;lt;/res&amp;gt;&amp;lt;/item&amp;gt;&amp;lt;/DIDL-Lite&amp;gt;"/&gt;&lt;CurrentTrackDuration val="0:03:22"/&gt;&lt;/InstanceID&gt;&lt;/Event&gt;
</LastChange>
```

## Change (1)
```
<Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/">
  <InstanceID val="0">
    <AVTransportURIMetaData val="&lt;DIDL-Lite 
      xmlns=&quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&quot; 
      xmlns:raumfeld=&quot;urn:schemas-raumfeld-com:meta-data/raumfeld&quot; 
      xmlns:upnp=&quot;urn:schemas-upnp-org:metadata-1-0/upnp/&quot; 
      xmlns:dc=&quot;http://purl.org/dc/elements/1.1/&quot; 
      xmlns:dlna=&quot;urn:schemas-dlna-org:metadata-1-0/&quot;&gt;&lt;item&gt;&lt;upnp:class&gt;object.item.audioItem.musicTrack&lt;/upnp:class&gt;&lt;raumfeld:section&gt;Spotify&lt;/raumfeld:section&gt;&lt;dc:title&gt;Curtains&lt;/dc:title&gt;&lt;upnp:artist&gt;Last Lynx&lt;/upnp:artist&gt;&lt;upnp:album&gt;Rifts EP&lt;/upnp:album&gt;&lt;upnp:albumArtURI dlna:profileID=&quot;JPEG_TN&quot;&gt;http://o.scdn.co/320/ade91d80d93dc88cfe1bb2decde2a6635320b391&lt;/upnp:albumArtURI&gt;&lt;res duration=&quot;0:03:22.000&quot; protocolInfo=&quot;spotify:*:audio/spotify-track:*&quot;&gt;spotify:track:6tLjF5JaRLlk5A8CPgy3W4&lt;/res&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;"/>
      <CurrentTrackDuration val="0:03:22"/>
    </InstanceID>
  </Event>
```

## AVTransportURIMetaData (1)
```
<DIDL-Lite 
  xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" 
  xmlns:raumfeld="urn:schemas-raumfeld-com:meta-data/raumfeld" 
  xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" 
  xmlns:dc="http://purl.org/dc/elements/1.1/" 
  xmlns:dlna="urn:schemas-dlna-org:metadata-1-0/">
  <item>
    <upnp:class>object.item.audioItem.musicTrack</upnp:class>
    <raumfeld:section>Spotify</raumfeld:section>
    <dc:title>Curtains</dc:title>
    <upnp:artist>Last Lynx</upnp:artist>
    <upnp:album>Rifts EP</upnp:album>
    <upnp:albumArtURI dlna:profileID="JPEG_TN">http://o.scdn.co/320/ade91d80d93dc88cfe1bb2decde2a6635320b391</upnp:albumArtURI>
    <res duration="0:03:22.000" protocolInfo="spotify:*:audio/spotify-track:*">spotify:track:6tLjF5JaRLlk5A8CPgy3W4</res>
  </item>
</DIDL-Lite>
```

### Event (2)
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<BufferFilled>1185099863</BufferFilled>
```

# 6. Seek

### Event (1)
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<LastChange>&lt;Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/"&gt;&lt;InstanceID val="0"&gt;&lt;TransportState val="PLAYING"/&gt;&lt;/InstanceID&gt;&lt;/Event&gt;
</LastChange>
```

## Change (1)
```
<Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/">
  <InstanceID val="0">
    <TransportState val="PLAYING"/>
  </InstanceID>
</Event>
```

### Event (2)
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<BufferFilled>-1258803906</BufferFilled>
```

# 7. Another track

### Event (1)
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<LastChange>&lt;Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/"&gt;&lt;InstanceID val="0"&gt;&lt;AVTransportURIMetaData val="&amp;lt;DIDL-Lite 
  xmlns=&amp;quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&amp;quot; 
  xmlns:raumfeld=&amp;quot;urn:schemas-raumfeld-com:meta-data/raumfeld&amp;quot; 
  xmlns:upnp=&amp;quot;urn:schemas-upnp-org:metadata-1-0/upnp/&amp;quot; 
  xmlns:dc=&amp;quot;http://purl.org/dc/elements/1.1/&amp;quot; 
  xmlns:dlna=&amp;quot;urn:schemas-dlna-org:metadata-1-0/&amp;quot;&amp;gt;&amp;lt;item&amp;gt;&amp;lt;upnp:class&amp;gt;object.item.audioItem.musicTrack&amp;lt;/upnp:class&amp;gt;&amp;lt;raumfeld:section&amp;gt;Spotify&amp;lt;/raumfeld:section&amp;gt;&amp;lt;dc:title&amp;gt;Brains&amp;lt;/dc:title&amp;gt;&amp;lt;upnp:artist&amp;gt;Jam Baxter&amp;lt;/upnp:artist&amp;gt;&amp;lt;upnp:album&amp;gt;The Gruesome Features&amp;lt;/upnp:album&amp;gt;&amp;lt;upnp:albumArtURI dlna:profileID=&amp;quot;JPEG_TN&amp;quot;&amp;gt;http://o.scdn.co/320/05e7f7c902a9b321db62ad062a62a5fc8fd40a66&amp;lt;/upnp:albumArtURI&amp;gt;&amp;lt;res duration=&amp;quot;0:04:35.000&amp;quot; protocolInfo=&amp;quot;spotify:*:audio/spotify-track:*&amp;quot;&amp;gt;spotify:track:3dqDRmye4pQMEHBFvJxhsA&amp;lt;/res&amp;gt;&amp;lt;/item&amp;gt;&amp;lt;/DIDL-Lite&amp;gt;"/&gt;&lt;CurrentTrackDuration val="0:04:35"/&gt;&lt;/InstanceID&gt;&lt;/Event&gt;
</LastChange>
```

## Change (1)
```
<Event 
  xmlns="urn:schemas-upnp-org:metadata-1-0/AVT/">
  <InstanceID val="0">
    <AVTransportURIMetaData val="&lt;DIDL-Lite 
      xmlns=&quot;urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/&quot; 
      xmlns:raumfeld=&quot;urn:schemas-raumfeld-com:meta-data/raumfeld&quot; 
      xmlns:upnp=&quot;urn:schemas-upnp-org:metadata-1-0/upnp/&quot; 
      xmlns:dc=&quot;http://purl.org/dc/elements/1.1/&quot; 
      xmlns:dlna=&quot;urn:schemas-dlna-org:metadata-1-0/&quot;&gt;&lt;item&gt;&lt;upnp:class&gt;object.item.audioItem.musicTrack&lt;/upnp:class&gt;&lt;raumfeld:section&gt;Spotify&lt;/raumfeld:section&gt;&lt;dc:title&gt;Brains&lt;/dc:title&gt;&lt;upnp:artist&gt;Jam Baxter&lt;/upnp:artist&gt;&lt;upnp:album&gt;The Gruesome Features&lt;/upnp:album&gt;&lt;upnp:albumArtURI dlna:profileID=&quot;JPEG_TN&quot;&gt;http://o.scdn.co/320/05e7f7c902a9b321db62ad062a62a5fc8fd40a66&lt;/upnp:albumArtURI&gt;&lt;res duration=&quot;0:04:35.000&quot; protocolInfo=&quot;spotify:*:audio/spotify-track:*&quot;&gt;spotify:track:3dqDRmye4pQMEHBFvJxhsA&lt;/res&gt;&lt;/item&gt;&lt;/DIDL-Lite&gt;"/>
      <CurrentTrackDuration val="0:04:35"/>
    </InstanceID>
  </Event>
```

## AVTransportURIMetaData (1)
```
<DIDL-Lite 
  xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" 
  xmlns:raumfeld="urn:schemas-raumfeld-com:meta-data/raumfeld" 
  xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" 
  xmlns:dc="http://purl.org/dc/elements/1.1/" 
  xmlns:dlna="urn:schemas-dlna-org:metadata-1-0/">
  <item>
    <upnp:class>object.item.audioItem.musicTrack</upnp:class>
    <raumfeld:section>Spotify</raumfeld:section>
    <dc:title>Brains</dc:title>
    <upnp:artist>Jam Baxter</upnp:artist>
    <upnp:album>The Gruesome Features</upnp:album>
    <upnp:albumArtURI dlna:profileID="JPEG_TN">http://o.scdn.co/320/05e7f7c902a9b321db62ad062a62a5fc8fd40a66</upnp:albumArtURI>
    <res duration="0:04:35.000" protocolInfo="spotify:*:audio/spotify-track:*">spotify:track:3dqDRmye4pQMEHBFvJxhsA</res>
  </item>
</DIDL-Lite>
```

### Event (2)
```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<BufferFilled>-1466753154</BufferFilled>
```

