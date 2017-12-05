var draggingImage;
var draggingText;
var draggingVideo;
var recorder;
Vue.directive('sortable', {
    inserted: function (el, binding) {
        new Sortable(el, binding.value || {})
    }
})

Vue.directive('tooltip', function (el, binding) {
    $(el).tooltip({
        title: binding.value,
        placement: binding.arg,
        trigger: 'hover'
    })
})

Vue.directive('resize', {
    // When the bound element is inserted into the DOM...
    inserted: function (el) {
        $(el).resizable({
            start: function (e, ui) {
                app.resizing = true;
            },
            stop: function (e, ui) {
                var element;
                if (ui.element.attr('is_image') == 'true') {
                    element = app.pages[app.curPage].images[ui.element.attr('index')];
                } else if (ui.element.attr('is_video') == 'true') {
                    element = app.pages[app.curPage].videos[ui.element.attr('index')];
                } else {
                    element = app.pages[app.curPage].texts[ui.element.attr('index')];
                }
                element.style.width = ui.element[0].scrollWidth / $('.page').width() * 100 + '%';
                app.prettifyItem(element);
                ui.element.css('height', '');
                // this needs to happen after the click event
                setTimeout(function () {
                    app.resizing = false;
                }, 10);
                if (!ui.element.is(':hover')) {
                    ui.element.removeClass('item-selected');
                }
            },
            resize: function (e, ui) {
                ui.element.css('height', '');
            },
            handles: 'se',
            autoHide: true,
        })
        .draggable({
            start: function (event, ui) {
                app.resizing = true;
                app.drag(event);
            },
            stop: function (event, ui) {
                setTimeout(function () {
                    app.resizing = false;
                }, 10);
                app.drop(event);
            }
        });
    }
});

var app = new Vue({
    el: '#app',
    data: {
        bookId: bookId,
        title: title,
        author: author,
        illustrator: illustrator,
        coverImageUrl: coverImageUrl,
        curPage: 0,
        pages: pages,
        editingText: defaultText,
        editingImage: defaultImage,
        editingVideo: null,
        notDefault: true,
        voices: voices,
        recording: false,
        audioPlayer: null,
        audioSpeed: 1,
        highlightWords: -1,
        modalShowing: false,
        uploadingImageFile: false,
        showDialogProgress: false,
        creatingImageMap: false,
        imageMapData: null,
        userRecording: false,
        TTSVoice: voice,
        readingLevel: readingLevel,
        lexileLevel: lexileLevel,
        pageWords: [],
        wordFiles: [],
        pageMapNames: [],
        vocabWords: [],
        vocabMaps: [],
        vocabCount: 0,
        draggingIndex: -1,
        resizing: false,
        adding: false,
        defaultFontSize: '2em',
        imageWebSearchInput: null,
        imageWebSearchResults: [],
        imageWebSearchLoading: false,
    },
    methods: {
        updateVocabList: function (event) {
            this.list.splice(event.newIndex, 0, this.list.splice(event.oldIndex, 1)[0])
        },
        loadPreviousPage: function () {
            if (this.curPage > 0) {
                this.curPage--;
            }
            app.updateProgressBar();
        },
        loadNextPage: function () {
            if (this.curPage + 1 == this.pages.length) {
                this.pages.push({
                    texts: [],
                    images: [],
                    videos: [],
                    vocabulary: [],
                });
            }
            this.curPage++;
            app.updateProgressBar();
        },
        addImage: function () {
            app.notDefault = false;
            var newImage = jQuery.extend(true, {}, defaultImage);
            newImage.style.display = 'none';
            this.pages[this.curPage].images.push(newImage);
            app.adding = true;
            app.imageClicked(newImage);
        },
        addText: function () {
            var newText = jQuery.extend(true, {}, defaultText);
            this.pages[this.curPage].texts.push(newText);
            newText.style['font-size'] = this.defaultFontSize;
            app.adding = true;
            app.textClicked(newText);
            setTimeout(function() {
                $('#textValue')[0].focus();
            }, 500);
        },
        addVideo: function () {
            app.notDefault = false;
            var newVideo = jQuery.extend(true, {}, defaultVideo);
            newVideo.style.display = 'none';
            this.pages[this.curPage].videos.push(newVideo);
            app.adding = true;
            app.videoClicked(newVideo);
        },
        insertPage: function () {
            this.pages.splice(this.curPage + 1, 0, {
                texts: [],
                images: [],
                videos: [],
                vocabulary: [],
            });
            this.curPage++;
        },
        duplicatePage: function() {
            this.pages.splice(this.curPage + 1, 0, jQuery.extend(true, {}, this.pages[this.curPage]));
            this.curPage++;
        },
        removePage: function () {
            if (confirm('Are you sure you want to delete this page?')) {
                this.pages.splice(this.curPage, 1);
                if (this.curPage > 0 || !this.pages.length) {
                    this.curPage--;
                }
            }
        },
        getIndex: function (itm, list) {
            var i;
            for (i = 0; i < list.length; i++) {
                if (itm[0] === list[i]) break;
            }
            return i >= list.length ? -1 : i;
        },
        drag: function (event) {
            draggingImage = null;
            draggingText = null;
            draggingVideo = null;
            var $el = $(event.target);
            if ($el.attr('is_image') == 'true') {
                draggingImage = event.target;
            } else if ($el.attr('is_video') == 'true') {
                draggingVideo = event.target;
            } else {
                draggingText = event.target;
            }
            app.draggingIndex = parseInt($el.attr('index'));
            app.draggingOffsetX = event.offsetX;
            app.draggingOffsetY = event.offsetY;
        },
        dragend: function (event) {
            // $(event.currentTarget).removeClass('item-selected');
        },
        allowDrop: function (event) {
            event.preventDefault();
        },
        drop: function (event) {
            var style;
            if (draggingImage) {
                style = this.pages[this.curPage].images[app.draggingIndex].style;
            } else if (draggingVideo) {
                style = this.pages[this.curPage].videos[app.draggingIndex].style;
            } else {
                style = this.pages[this.curPage].texts[app.draggingIndex].style;
            }
            var $target = $(event.target);
            // set as percent so resizing works
            style.left = $target.css('left').replace('px', '') / $('.page').width() * 100 + '%';
            style.top = $target.css('top').replace('px', '') / $('.page').height() * 100 + '%';
        },
        getPercent: function (val, digits, upOrDown) {
            var val = parseFloat(val.replace('%', ''));
            if (upOrDown == 'up') {
                val += 1;
            } else if (upOrDown == 'down') {
                val -= 1;
            }
            if (val % 1) {
                val = val.toFixed(digits);
            }
            return val + '%';
        },
        prettifyItem: function (item) {
            item.style.left = app.getPercent(item.style.left, 3);
            item.style.top = app.getPercent(item.style.top, 3);
            item.style.width = app.getPercent(item.style.width, 3);
        },
        reloadAudio: function () {
            var audioPlayer = $('#audioPlayer')[0];
            if (audioPlayer) {
                audioPlayer.load();
            }
        },
        imageClicked: function (element, event) {
            app.elementClicked(element, false, true, false, event);
        },
        textClicked: function (element, event) {
            app.elementClicked(element, true, false, false, event);
        },
        videoClicked: function (element, event) {
            app.elementClicked(element, false, false, true, event);
        },
        elementClicked: function (element, isText, isImage, isVideo, event) {
            if (!event || (!app.resizing && !$(event.target).is('.ui-resizable-handle'))) {
                app.editingVideo = isVideo ? element : null;
                app.editingImage = isImage ? element : null;
                app.editingText = isText ? element : null;
                app.prettifyItem(element);
                $('#editModal').modal({});
                app.modalShowing = true;
                if (isText) {
                    app.reloadAudio();
                }
            }
        },
        editVocab: function () {
            app.vocabCount = 0;
            app.pageWords = [];
            for (var j = 0; j < app.pages[app.curPage].texts.length; j++) {
                for (var i = 0; i < app.pages[app.curPage].texts[j].text.split(/[\s]/).length; i++) {
                    var word = {
                        id: app.vocabCount++,
                        type: "word",
                        word: app.pages[app.curPage].texts[j].text.split(/[\s]/)[i]
                    };
                    //word.word = word.word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"]/g,"");
                    //word.word = word.word.replace(/\s{2,}/g," ");
                    word.word = word.word.replace(" ", "");
                    word.word = word.word.toLowerCase();
                    if (!app.containsVocab(word, app.pageWords) && word.word.replace(/\s/g, '').length && word.word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"]/g, '').length) {
                        app.pageWords.push(word);
                    }
                }
            }
            app.pageMapNames = [];
            for (var i = 0; i < app.pages[app.curPage].images.length; i++) {
                var areaObjects = app.getAreaObjects(app.pages[app.curPage].images[i].imageMapHTML);
                for (var j = 0; j < areaObjects.length; j++) {
                    var mapObject = {
                        id: app.vocabCount++,
                        type: "map",
                        word: areaObjects[j].dataset.name.toLowerCase()
                    };
                    if (!app.containsVocab(mapObject, app.pageMapNames)) {
                        app.pageMapNames.push(mapObject);
                    }
                }
            }
            app.vocabWords = [];
            app.vocabMaps = [];
            for (var i = 0; i < app.pages[app.curPage].vocabulary.length; i++) {
                app.vocabWords.push({
                    value: app.pages[app.curPage].vocabulary[i].word,
                    type: app.pages[app.curPage].vocabulary[i].type,
                    id: app.pages[app.curPage].vocabulary[i].id
                });
            }
            $('#vocabModal').modal({});
        },
        containsVocab: function (obj, vocabulary) {
            var i;
            for (i = 0; i < vocabulary.length; i++) {
                if (vocabulary[i].word == obj.word) {
                    if (vocabulary[i].type == obj.type) {
                        return true;
                    }
                }
            }
            return false;
        },
        reloadVocab: function () {
            if (app.editingText) {
                for (var i = 0; i < app.pages[app.curPage].vocabulary.length; i++) {
                    var wordExists = false;
                    for (var j = 0; j < app.pages[app.curPage].texts.length; j++) {
                        //if((app.pages[app.curPage].texts[j].text.toLowerCase().indexOf(app.pages[app.curPage].vocabulary[i].word) != -1) ){
                        if (new RegExp("\\b" + app.pages[app.curPage].vocabulary[i].word + "\\b").test(app.pages[app.curPage].texts[j].text.toLowerCase())) {
                            wordExists = true;
                        }
                        //}
                    }
                    if (!wordExists && app.pages[app.curPage].vocabulary[i].type != "map") {
                        app.pages[app.curPage].vocabulary.splice(i, 1);
                    }
                }
            }
            if (app.editingImage) {
                for (var i = 0; i < app.pages[app.curPage].vocabulary.length; i++) {
                    var imageExists = false;
                    for (var j = 0; j < app.pages[app.curPage].images.length; j++) {
                        var areaObjects = app.getAreaObjects(app.pages[app.curPage].images[j].imageMapHTML);
                        for (var k = 0; k < areaObjects.length; k++) {
                            if (areaObjects[k].dataset.name.toLowerCase() == app.pages[app.curPage].vocabulary[i].word) {
                                imageExists = true;
                            }
                        }
                    }
                    if (!imageExists && app.pages[app.curPage].vocabulary[i].type != "word") {
                        app.pages[app.curPage].vocabulary.splice(i, 1);
                    }
                }
            }
        },
        reorderVocab({
            oldIndex,
            newIndex
        }) {
            const movedItem = app.pages[app.curPage].vocabulary.splice(oldIndex, 1)[0]
            app.pages[app.curPage].vocabulary.splice(newIndex, 0, movedItem)
        },
        editSingleWords: function(){
            reloadVocab();
            $('#singleWordModal').modal({});
        },
        save: function () {
            $.post(saveBookUrl, {
                    title: this.title,
                    author: this.author,
                    voice: this.TTSVoice,
                    illustrator: this.illustrator,
                    cover_image_url: this.coverImageUrl,
                    pages: JSON.stringify(this.pages),
                    book_id: this.bookId,
                    reading_level: this.readingLevel,
                    lexile_level: this.lexileLevel
                },
                function (response) {
                    app.bookId = response.book_id;
                });
        },
        singleWordRecord: function(){
            app.userRecording = true;
            for (var i = 0; i < app.editingText.text.split(/[\s]/).length; i++) {
                app.editingText.audio.values.push(app.editingText.text.split(/[\s]/)[i]);
            }
            if (!recorder) {
                initRecorder(this.startRecord, function (e) {
                    // decodeOgg(e.detail, currentRecordingItem);
                    app.showDialogProgress = true;
                    var blob = new Blob([e.detail], {
                        type: 'audio/ogg'
                    });
                    blob.name = 'audio.ogg';
                    blob.lastModifiedDate = new Date();
                    var formData = new FormData();
                    formData.append('audio', blob, 'audio.ogg');
                    // formData.append('file', this.file, this.getName());
                    // formData.append('upload_file', true);
                    $.ajax({
                        type: 'POST',
                        url: saveAudioUrl,
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function (response) {
                            app.showDialogProgress = false;
                            if (response) {
                                app.editingText.audio.recordingType = "userRecording";
                                app.editingText.audio.recording = response;
                                app.$forceUpdate();
                                app.reloadAudio();
                            }
                        },
                        error: function (response) {
                            alert('Error. Your AWS credentials might not be configured correctly.');
                        }
                    });
                });
                return;
            }
            recorder.start();
            this.recording = true;
        },
        startRecord: function () {
            app.userRecording = true;
            app.editingText.audio.values = [];
            for (var i = 0; i < app.editingText.text.split(/[\s]/).length; i++) {
                app.editingText.audio.values.push(app.editingText.text.split(/[\s]/)[i]);
            }
            if (!recorder) {
                initRecorder(this.startRecord, function (e) {
                    // decodeOgg(e.detail, currentRecordingItem);
                    app.showDialogProgress = true;
                    var blob = new Blob([e.detail], {
                        type: 'audio/ogg'
                    });
                    blob.name = 'audio.ogg';
                    blob.lastModifiedDate = new Date();
                    var formData = new FormData();
                    formData.append('audio', blob, 'audio.ogg');
                    // formData.append('file', this.file, this.getName());
                    // formData.append('upload_file', true);
                    $.ajax({
                        type: 'POST',
                        url: saveAudioUrl,
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function (response) {
                            app.showDialogProgress = false;
                            if (response) {
                                app.editingText.audio.recordingType = "userRecording";
                                app.editingText.audio.recording = response;
                                app.$forceUpdate();
                                app.reloadAudio();
                            }
                        },
                        error: function (response) {
                            alert('Error. Your AWS credentials might not be configured correctly.');
                        }
                    });
                });
                return;
            }
            recorder.start();
            this.recording = true;
        },
        stopRecord: function () {
            recorder.stop();
            this.recording = false;
        },
        uploadAudio: function (){
        },
        editHighlighting: function () {
            this.audioPlayer = $('#audioPlayer')[0];
            this.editingText.audio.meta = [];
            this.audioPlayer.playbackRate = this.audioSpeed;
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.play();
            //Find length of each word
            //Highlight based of the word length
            $('#editHighlightButton').blur();
        },
        registerNextHighlightWord: function () {
            if (!$('#audioPlayer')[0]) {
                return;
            }
            var nextWord = this.editingText.text.replace(/  +/g, ' ').trim().split(/[\s]/)[this.editingText.audio.meta.length];
            if (nextWord) {
                var start = 0;
                if (this.editingText.audio.meta.length) {
                    start = this.editingText.audio.meta[this.editingText.audio.meta.length - 1].end + 1;
                }
                end = start + nextWord.length
                this.editingText.audio.meta.push({
                    'time': $('#audioPlayer')[0].currentTime,
                    'start': start,
                    'end': end
                });
            }
        },
        markHighlightWord: function () {},
        audioPlayed: function () {
            this.audioPlayer = $('#audioPlayer')[0];
            if (app.userRecording) {
                this.audioPlayer.playbackRate = this.audioSpeed;
            }
            if (!app.highlightWordInterval && this.audioPlayer) {
                app.highlightWordInterval = setInterval(function () {
                    for (var i = app.editingText.audio.meta.length - 1; i >= 0; i--) {
                        if (app.audioPlayer.currentTime >= app.editingText.audio.meta[i].time) {
                            app.highlightWords = i;
                            break;
                        }
                    }
                }, 10);
            }
        },
        audioEnded: function () {
            app.highlightWords = -1;
            clearInterval(app.highlightWordInterval);
            app.highlightWordInterval = null;
        },
        clearAudio: function () {
            app.editingText.audio.meta = [];
            app.editingText.audio.values = [];
            app.editingText.audio.recording = null;
            app.editingText.audio.recordingType = "none";
        },
        saveTTSAudio: function () {
            if (app.TTSVoice) {
                app.userRecording = false;
                $.ajax({
                    type: 'POST',
                    url: savettsUrl,
                    data: {
                        text: this.editingText.text,
                        voiceId: app.TTSVoice
                    },
                    success: function (response) {
                        app.showDialogProgress = false;
                        app.editingText.audio.meta = [];
                        app.editingText.audio.values = [];
                        if (response) {
                            app.editingText.audio.recording = response.url;
                            app.editingText.audio.recordingType = "tts";
                            app.editingText.audio.text = app.editingText.text;
                            for (var i = 0; i < response.audio_info.length; i++) {
                                app.editingText.audio.meta.push({
                                    'time': response.audio_info[i].time / 1000,
                                    'start': response.audio_info[i].start,
                                    'end': response.audio_info[i].end,
                                    'value': response.audio_info[i].value,
                                })
                                app.editingText.audio.values.push(response.audio_info[i].value);
                            }
                            app.$forceUpdate();
                            app.reloadAudio();
                        }
                    },
                    error: function (response) {
                        alert('Error. Your AWS credentials might not be configured correctly.');
                    }
                });
            }
        },
        removeItem: function (item) {
            if (app.editingText) {
                app.pages[app.curPage].texts.splice(app.pages[app.curPage].texts.indexOf(app.editingText), 1);
            } else if (app.editingImage) {
                app.pages[app.curPage].images.splice(app.pages[app.curPage].images.indexOf(app.editingImage), 1);
            } else if (app.editingVideo) {
                app.pages[app.curPage].videos.splice(app.pages[app.curPage].videos.indexOf(app.editingVideo), 1);
            }
            app.notDefault = true;
        },
        closeWindow: function (item) {},
        orderChanged: function () {
            if (app.editingText) {
                var texts = app.pages[app.curPage].texts;
                var newPosition = parseInt($('#orderValue').val());
                var curIndex = texts.indexOf(app.editingText);
                texts.splice(curIndex, 1);
                if (newPosition > texts.length - 1) {
                    texts.push(app.editingText);
                } else {
                    texts.splice(newPosition, 0, app.editingText);
                }
            }
            if (app.editingVideo) {
                var videos = app.pages[app.curPage].videos;
                var newPosition = parseInt($('#orderVideo').val());
                var curIndex = videos.indexOf(app.editingVideo);
                videos.splice(curIndex, 1);
                if (newPosition > videos.length - 1) {
                    videos.push(app.editingVideo);
                } else {
                    videos.splice(newPosition, 0, app.editingVideo);
                }
            }

        },
        fontSizeChanged: function () {
            app.defaultFontSize = $('#fontSizeInput').val();
        },
        horizontallyCenterItem: function(item) {
            item.style.left = (100 - parseFloat(item.style.width)) / 2 + '%';
            app.prettifyItem(item);
        },
        clickFileInput: function (inputId) {
            $('#' + inputId).click();
        },
        uploadCoverImage: function () {
            app.uploadFile('coverImageInput', saveImageUrl, function (response) {
                app.coverImageUrl = response;
            });
        },
        uploadImageFile: function () {
            app.uploadFile('fileImageInput', saveImageUrl, function (response) {
                app.editingImage.style.display = null;
                app.editingImage.src = response;
                app.notDefault = true;
            });
        },
        uploadVideoFile: function () {
            app.uploadFile('fileVideoInput', saveVideoUrl, function (response) {
                app.editingVideo.style.display = null;
                app.editingVideo.src = response;
                app.notDefault = true;
            });
        },
        uploadAudioFile: function(){
            app.uploadFile('fileAudioInput', saveAudioUrl, function (response) {
                app.editingText.audio.recording = response;
                app.editingText.audio.recordingType = "userRecording";
            });
        },
        uploadFile: function (inputId, url, callback) {
            if ($('#' + inputId)[0].files) {
                app.showDialogProgress = true;
                var file = $('#' + inputId)[0].files[0];
                // var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));
                // // Internet Explorer 6-11
                // var isIE = /*@cc_on!@*/false || !!document.documentMode;
                // var supportsOGG = !(isSafari || isIE)
                var formData = new FormData();
                if (app.editingImage) {
                    formData.append('image', file);
                } else if(app.editingVideo) {
                    formData.append('video', file);
                }
                else{
                    formData.append('audio', file);
                }
                $.ajax({
                    type: 'POST',
                    url: url,
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function (response) {
                        if (response) {
                            app.showDialogProgress = false;
                            callback(response);
                            $('#' + inputId)[0].value = null;
                            app.reloadAudio();
                            app.$forceUpdate();
                        }
                    },
                    error: function (response) {
                        alert('Error. Your AWS credentials might not be configured correctly.');
                    }
                });
            }
        },
        updateWidth: function (up) {
            (app.editingImage || app.editingText).style.width = app.getPercent($('#widthValue').val(), 1, up ? 'up' : 'down');
        },
        getDisplayText: function (text) {
            return text.replace(/\n/g, '<br>');
        },
        updateProgressBar: function () {
            $('#progress-bar .complete').width($('#progress-bar').width() * ((app.curPage) / (app.pages.length - 1)));
        },
        openSettings: function () {
            $('#settingsModal').modal({});
        },
        deleteBook: function () {
            if (confirm('Are you sure you want to delete this book?')) {
                location.href = deleteBookUrl + '?book_id=' + app.bookId;
            }
        },
        insertDefaultCoverInfo: function () {
            if (app.title.length) {
                var newText = jQuery.extend(true, {}, defaultText);
                newText.text = app.title;
                this.pages[this.curPage].texts.push(newText);
            }
            if (app.author.length) {
                var newText = jQuery.extend(true, {}, defaultText);
                newText.text = 'Written by ' + app.author;
                newText.style.top = '30%';
                newText.style['font-size'] = '1em';
                this.pages[this.curPage].texts.push(newText);
            }
            if (app.illustrator.length) {
                var newText = jQuery.extend(true, {}, defaultText);
                newText.text = 'Illustrated by ' + app.illustrator;
                newText.style.top = '50%';
                newText.style['font-size'] = '1em';
                this.pages[this.curPage].texts.push(newText);
            }
        },
        viewBook: function () {
            var win = window.open('/book/' + app.bookId + '/', '_blank');
            win.focus();
        },
        translateColor: function (color) {
            if (color == 'red') {
                return '#dc3545';
            }
            return color;
        },
        getAreaObjects: function (str) {
            console.log($.parseHTML(str));
            return $.parseHTML(str);
        },
        addImageMap: function () {
            app.creatingImageMap = true;
            var image = app.editingImage;
            var mapData = {
                src: image.src,
                maps: (image.imageMapHTML && image.imageMapHTML.length) ? image.imageMapHTML : '',
            };

            $(document).ready(function () {
                summerHtmlImageMapCreator(mapData.src, mapData.maps,
                    _saveCb,
                    _cancelCb)
            });

            function _saveCb(data) {
                image.imageMapHTML = data;
                app.creatingImageMap = false;
            }

            function _cancelCb() {
                app.creatingImageMap = false;
            }
        },
        doImageWebSearch: function() {
            app.imageWebSearchResults = [];
            app.imageWebSearchLoading = true;
            $.post('/create-book/image-search/', {q: app.imageWebSearchInput}, function(response) {
                app.imageWebSearchLoading = false;
                if (response.items) {
                    app.imageWebSearchResults = response.items;
                    app.$forceUpdate();
                }
            })
        },
        selectWebImage: function(url) {
            app.editingImage.style.display = null;
            app.editingImage.src = url;
            app.notDefault = true;
        },
        imageWebSearchInputChanged: function() {
            if (app.imageWebSearchInput.length == 0) {
                app.imageWebSearchResults = [];
            }
        }
    }
});

function setBookSize() {
    var ratio = 4 / 3;
    var windowWidth = $(window).width();
    var windowHeight = $(window).height() - $('#toolbar').outerHeight();
    console.log('windowHeight: ' + windowHeight, 'toolbar height', $('#toolbar').outerHeight());
    if (windowWidth / windowHeight >= ratio) {
        // screen is wider than our ratio, snap to height
        bookHeight = windowHeight;
        bookWidth = parseInt(windowHeight * ratio);
    } else {
        // snap to width
        bookWidth = windowWidth;
        bookHeight = parseInt(windowWidth / ratio);
    }
    $('#book, #navbarDiv').width(bookWidth);
    //$('#progress-bar').width(bookWidth);
    $('.page').css('min-width', bookWidth / 2).height(bookHeight);
    //$('#cover-div').width(bookWidth / 2).css('background-position', '-' + (bookWidth * .1225) + 'px');
    //    forwardButton.css({top: 5, right: (windowWidth - bookWidth) / 2 - 100});
    $('#book').css('font-size', bookWidth * .03);
    $('.button-container-right img').width(bookWidth * .08);
}
$(window).resize(function () {
    setBookSize();
});
//Autosave
window.setInterval(function(){
    console.log("Saving");
    app.save();
}, 10000);
$('#book').on('mouseover', '.text, .image, .video', function (event) {
    $(this).addClass('item-selected');
}).on('mouseout', '.text, .image, .video', function (event) {
    if (!app.resizing && !app.modalShowing) {
        $(this).removeClass('item-selected');
        app.$forceUpdate();
    }
});
$(document).ready(function () {
    setBookSize();
    $('#editModal').draggable({
        handle: '.modal-header'
    });
    $('#editModal').on('hidden.bs.modal', function (e) {
        app.adding = false;
        if (app.editingText) {
            if (app.editingText.text == "") {
                app.removeItem(e);
            }
            if (app.editingText.audio.type == "none") {
                app.clearAudio();
            }
            var fontSize = app.editingText.style['font-size'];
            var fontType = app.editingText.style['font-family'];
            if (parseFloat(app.editingText.style.left) > 95) {
                //console.log(parseFloat(app.editingText.style.left));
                app.editingText.style.left = "90%";
            }
            if (parseFloat(app.editingText.style.top) > 95) {
                //console.log(parseFloat(app.editingText.style.left));
                app.editingText.style.top = "90%";
            }
            app.reloadVocab();
        }
        if (app.editingImage) {
            app.reloadVocab();
        }
        if (app.notDefault == false) {
            app.removeItem(e);
            app.notDefault = true;
        }
        app.reloadVocab();
        app.modalShowing = false;
    });
    var insertedDefaultCoverInfo = false;
    $('#settingsModal').on('hidden.bs.modal', function (e) {
        if (!bookId && !insertedDefaultCoverInfo) {
            insertedDefaultCoverInfo = true;
            app.insertDefaultCoverInfo();
        }
    });
    $('body').keyup(function (e) {
        if (e.keyCode == 32) {
            // space
            app.registerNextHighlightWord();
        }
    });
    $('body').on('keydown', '#widthValue', function (e) {
        if (e.keyCode == 38) {
            // up
            app.updateWidth(true);
        } else if (e.keyCode == 40) {
            // down
            app.updateWidth(false);
        }
    });
    if (!bookId) {
        app.openSettings();
    };
});

function initRecorder(initCallback, dataAvailableCallback) {
    recorder = new Recorder({
        // monitorGain: parseInt(monitorGain.value, 10),
        // monitorGain: 0,
        // numberOfChannels: 1,
        // bitRate: 64000,
        // encoderSampleRate: 48000,
        leaveStreamOpen: true,
        encoderPath: '/static/catalyst/js/encoderWorker.min.js'
    });
    recorder.addEventListener('streamReady', function (e) {
        console.log('Audio stream is ready.');
        initCallback();
    });
    recorder.addEventListener('dataAvailable', dataAvailableCallback);
    recorder.initStream();
}
