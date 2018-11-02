const data = {
  newPlaylist: {
    name: '',
    error: false,
    wait: false
  },
  newFile: {
    file: null,
    name: '',
    progress: 0
  },
  activePlaylist: [],
  playlists: [],
  files: [],
  tracks: [],
  notifications: [],
  filesSortOptions: {
    group: {
      name: 'files',
      pull: 'clone',
      put: false
    },
    handle: '.playlists__item-drag',
    sort: false
  },
  tracksSortOptions: {
    group: {
      name: 'tracks',
      put: 'files'
    },
    handle: '.playlists__item-drag'
  },
  notificationsSortOptions: {
    group: {
      name: 'notifications',
      put: 'files'
    },
    handle: '.playlists__item-drag'
  }
};

var App = new Vue({
  el: '#playlists-app',
  data,
  methods: {
    playTrack(id, index, e) {
      axios.post('https://28devs.com/api/?play').then(res => {
        document.getElementById("audio-play").innerHTML = `<audio autoplay controls><source src="${res.data}"></audio>`;
      });
    },

    deleteFile(id, index) {
      if (!confirm('Удалить файл?')) return;

      axios.post(`https://28devs.com/api/?file-delete-${id}`).then(res => {
        if (+res.data.id === id) {
          this.files.splice(index, 1);
        }
      });
    },

    deleteTrack(from, index) {
      if (!confirm('Удалить трек из плейлиста?')) return;

      this[from].splice(index, 1);
    },

    cloneFile(el) {
      return {
        time: el.time,
        name: el.name,
        id: el.id,
        start: '00:00',
        startObj: {
          HH: '00',
          mm: '00'
        }
      };
    },

    createPlaylist() {
      if (this.newPlaylist.name === '') {
        this.newPlaylist.error = true;
        return;
      } else {
        this.newPlaylist.wait = true;
      }

      let req = Qs.stringify({
        'playlist-create': true,
        name: this.newPlaylist.name
      });

      axios.post('https://28devs.com/api/', req).then(res => {
        this.activePlaylist = res.data;
        this.playlists.push(res.data);
      });

      this.newPlaylist.name = '';
      this.newPlaylist.wait = false;
    },

    deletePlaylist(id, index) {
      if (!confirm('Удалить плейлист?')) return;

      this.playlists.splice(index, 1);
      this.activePlaylist = this.playlists.length ? this.playlists[0] : [];
    },

    updatePlaylist() {
      let notifications = this.notifications.map(elem => {
        return {
          id: elem.id,
          name: elem.name,
          start: elem.startObj.HH + ':' + elem.startObj.mm,
          time: elem.time
        };
      });

      let req = {
        'playlist-update': true,
        tracks: this.tracks,
        notifications: notifications
      };

      req = Qs.stringify(req);

      axios.post(
        `https://28devs.com/api/?update-playlist-${this.activePlaylist.id}`,
        req
      );
    },

    fileChange(e) {
      let file = e.target.files || e.dataTransfer.files;

      if (file[0].size > 1073741824) {
        alert('Файл больше 1GB');
        return;
      }

      this.newFile.name = file[0].name;
      this.newFile.file = file[0];
    },

    uploadFile() {
      let formData = new FormData();

      formData.append('file-create', 'true');
      formData.append('name', this.newFile.name);
      formData.append('file', this.newFile.file);

      axios
        .post('https://28devs.com/api/?file-create', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: progressEvent => {
            this.newFile.progress = (
              (progressEvent.loaded * 100) /
              this.newFile.file.size
            ).toFixed(0);
          }
        })
        .then(res => {
          this.newFile.name = '';
          this.newFile.progress = 0;
          this.files.push(res.data);
        });
    }
  },

  mounted() {
    // get playlists and files list when app is loaded
    axios.get('https://28devs.com/api/?playlists').then(res => {
      this.playlists = res.data;
      this.activePlaylist = res.data[0];
    });

    axios.get('https://28devs.com/api/?files').then(res => {
      this.files = res.data.files;
    });

    document.getElementById('playlists-app').classList.remove('hidden');
  },

  watch: {
    activePlaylist(playlist) {
      // get tracks and notifications list when change the active playlist
      if (this.playlists.length === 0) {
        this.tracks = [];
        this.notifications = [];
        return;
      }

      axios.get(`https://28devs.com/api/?playlist-${playlist.id}`).then(res => {
        this.tracks = res.data.tracks;
        this.notifications = res.data.notifications.map(elem => {
          let start = elem.start.split(':');
          elem.startObj = {
            HH: start[0],
            mm: start[1]
          };
          return elem;
        });
      });
    },

    tracks() {
      // send tracks and notifications list when they changed
      this.updatePlaylist();
    },

    notifications: {
      handler() {
        // send tracks and notifications list when they changed
        this.updatePlaylist();
      },
      deep: true
    }
  }
});