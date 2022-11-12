## A little repo that help you craw all subtitle of a anime seasion on Bilibili and convert it to SRT (SubRip file format) format

# How to use?

Coppy all code in js file and paste to brower console and call

```js
loadAllSubtitleOfTheSeason({ seasion_id: "you get id from url" });
```

## Where is the seasion_id

Let's look on the bilibili url

https://www.bilibili.tv/vi/play/1048837/11246947?bstar_from=bstar-web.pgc-video-detail.episode.all

https://www.bilibili.tv/vi/play/<season_id>/{episode_id}?bstar_from=bstar-web.pgc-video-detail.episode.all

```js
loadAllSubtitleOfTheSeason({ seasion_id: 1048837 });
```

# Note

- To prevent CORS error, you should paste code in the console of [Bilibili](https://www.bilibili.tv) websilte
