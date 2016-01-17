# Spotify service-actions

This document describes the relevant upnp service actions that the AVTransport service of Raumfeld offers for Spotify usage.

## Speaker living room (MediaRenderer:1 - AVTransport:1)
- `GetPositionInfo([In] int InstanceID, [Out] string TrackDuration, [Out] string RelTime)`
- `GetTransportSettings([In] int InstanceID, [Out] PlayMode PlayMode)`
- `string LastChange`
- `string AVTransportURIMetaData`
- `string CurrentTrackDuration`
