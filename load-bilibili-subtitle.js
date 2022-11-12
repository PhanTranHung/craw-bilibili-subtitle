function request({ url, method = "GET" }) {
  return new Promise((res, rej) => {
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        // Typical action to be performed when the document is ready:
        try {
          const data = JSON.parse(xhttp.responseText);
          res(data);
        } catch (error) {
          res(xhttp.responseText);
        }
      }
    };
    xhttp.onabort = rej;
    xhttp.onerror = rej;
    xhttp.open(method, url, true);
    xhttp.send();
  });
}

function excuteCodeInSanbox({ code }) {
  // this is dangerous
  // we suggest use vm2(https://github.com/patriksimek/vm2) to excute code in nodejs
  return eval(code);
}

async function getInittialData({ season_id }) {
  const seasion_api = `https://www.bilibili.tv/vi/play/${season_id}`;

  const rawData = await request({ url: seasion_api });
  const regex = /(?<=<script>window.__initialState=).*(?=<\/script>)/g;

  const code = rawData.match(regex);
  if (code.length <= 0) return undefined;

  const season_data = excuteCodeInSanbox({ code: code[0] });
  return season_data;
}

function getAllEpisode(initialData = window.__initialState) {
  const ogv = initialData.ogv;
  const sectionsList = ogv.sectionsList?._rawValue
    ? ogv.sectionsList._rawValue
    : ogv.sectionsList;
  let episodes = [];

  sectionsList.forEach((section) => {
    episodes = [...episodes, ...section.episodes];
  });

  return episodes;
}

async function getSubtitleListOfEpisode({
  episode_id,
  s_locale = "vi_VN",
  platform = "web",
  spm_id = "bstar-web.pgc-video-detail.0.0",
  from_spm_id = "bstar-web.anime-tab.more.all",
}) {
  const subtitle_api = `https://api.bilibili.tv/intl/gateway/web/v2/subtitle?s_locale=${s_locale}&platform=${platform}&episode_id=${episode_id}&spm_id=${spm_id}&from_spm_id=${from_spm_id}`;

  return request({
    url: subtitle_api,
  }).then((data) => data.data.subtitles);
}

async function getSubtitleData({ subtitle_url }) {
  return request({ url: subtitle_url }).then((data) => data.body);
}

function formatDateFromSecond(inputSecond) {
  const inputMilisecond = inputSecond * 1000;
  const date = new Date(inputMilisecond);

  // These is no movie longer than 1 day, so this code is correct in this case
  return {
    hours: date.getUTCHours().toString().padStart(2, 0),
    minutes: date.getUTCMinutes().toString().padStart(2, 0),
    seconds: date.getUTCSeconds().toString().padStart(2, 0),
    miliseconds: date.getUTCMilliseconds().toString().padStart(3, 0),
  };
}

function convertSubtitleToSRT(bilibiliSubtitle) {
  const formatTime = (inputSecond) => {
    const { hours, minutes, seconds, miliseconds } =
      formatDateFromSecond(inputSecond);
    return `${hours}:${minutes}:${seconds},${miliseconds}`;
  };
  return bilibiliSubtitle
    .map((bSub, idx) => {
      const { content, from, location, to } = bSub;
      const srtSub = [];

      // index of subtitle
      const index = idx + 1;
      srtSub.push(index);

      // show time of subtitle
      const startTime = formatTime(from);
      const endTime = formatTime(to);
      srtSub.push(`${startTime} --> ${endTime}`);

      // content of subtitle
      srtSub.push(content);

      // seperator of subtitle
      srtSub.push("");

      return srtSub.join("\n");
    })
    .join("\n");
}

async function loadAllSubtitleOfTheSeason({ season_id }) {
  const initialData = await getInittialData({ season_id });
  const allEpisode = getAllEpisode(initialData);
  const allEpisodeWithSrtSubPromise = allEpisode
    .map(async (episode) => {
      const subtitles = await getSubtitleListOfEpisode({
        episode_id: episode.episode_id,
      });
      return {
        ...episode,
        subtitles,
      };
    })
    .map(async (episodePromise) => {
      const episode = await episodePromise;
      const subtitles = episode.subtitles;
      const subtitlesWithSrtSubPromise = subtitles.map(async (sub) => {
        const subData = await getSubtitleData({ subtitle_url: sub.url }).then();
        const srtSub = convertSubtitleToSRT(subData);
        return {
          ...sub,
          subtitle: srtSub,
        };
      });

      const subtitlesWithSrtSub = await Promise.all(subtitlesWithSrtSubPromise);

      return {
        ...episode,
        subtitles: subtitlesWithSrtSub,
      };
    });

  const allEpisodeWithSrtSub = await Promise.all(allEpisodeWithSrtSubPromise);
  return allEpisodeWithSrtSub;
}

// Look on url of bilibili
// https://www.bilibili.tv/vi/play/1048837/11246947?bstar_from=bstar-web.pgc-video-detail.episode.all
// https://www.bilibili.tv/vi/play/<season_id>/{episode_id}?bstar_from=bstar-web.pgc-video-detail.episode.all

loadAllSubtitleOfTheSeason({ season_id: 1048837 }).then(console.log);
