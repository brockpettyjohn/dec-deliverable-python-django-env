var Page = {
    template: '\
    <div class="outer">\
        <div class="content">\
            <div class="inner">\
                <template v-for="(image, imageIndex) in page.images" >\
                    <img :src="image.src" :style="image.style" :useMap="\'#page-\' + pageIndex + \'-image-\' + imageIndex + \'-map\' "/>\
                    <map v-if="image.imageMapHTML && image.imageMapHTML.length" v-html="image.imageMapHTML" :page="pageIndex" :name=" \'page-\' + pageIndex + \'-image-\' + imageIndex + \'-map\'"></map >\
                </template>\
                <video v-for="(video,videoIndex) in page.videos" :play="[\'page-\' + pageIndex + \'-video-\' + videoIndex]" :src="video.src" :style="video.style"></video>\
                <div v-for="(text, textIndex) in page.texts" class="text" :style="text.style"\
                    v-bind:class="{ shadow: text.shadow, bold: text.bold, italic: text.italic, unselectable: true }">\
                    <template v-if="(text.audio.recordingType == \'tts\' && !understandMode)" v-for="word in text.texts_array">\
                        <span v-if="word.type == \'filler\'" v-html="word.content"></span><span v-if="word.type == \'word\'" :word="[\'page-\' + pageIndex + \'-text-\' + textIndex + \'-word-\' + word.wordIndex]" class="word" :page="pageIndex" :textIndex = "textIndex" :wordIndex = "word.wordIndex" \
                            v-bind:class="{ highlight: (curPageText == textIndex && highlightWord == word.wordIndex) || (hoverTextIndex == textIndex && hoverWordIndex == word.wordIndex)}" v-html="word.content"></span>\
                    </template>\
                    <template v-if="(text.audio.recordingType != \'tts\' || understandMode == true)" v-for="(word, wordIndex) in text.text_split">\
                        <span :word="[\'page-\' + pageIndex + \'-text-\' + textIndex + \'-word-\' + wordIndex]" class="word" :page="pageIndex" :wordIndex = "wordIndex" :textIndex = "textIndex"\
                            v-bind:class="{ highlight: curPageText == textIndex && highlightWord == wordIndex || (hoverTextIndex == textIndex && hoverWordIndex == wordIndex)}" v-html="word + \' \'">\
                        </span>\
                    </template>\
                </div>\
            </div>\
        </div>\
    </div>',
    props: ['page', 'pageIndex', 'curPageText', 'highlightWord', 'understandMode', 'hoverWordIndex', 'hoverTextIndex'],
    methods: {},
}
var app = new Vue({
    el: '#app',
    data: {
        pages: pages,
        userRecordings: {},
        curPage: 0,
        curPageText: -1,
        curPageVideo: -1,
        curPageVocab: -1,
        hoverTextIndex: -1,
        hoverWordIndex: -1,
        audio: new Audio(),
        video: null,
        vocab: null,
        incorrectVocabCount: 0,
        audioSpeed: 1,
        previousAudioSrc: null,
        mobileStart: false,
        audioOnEndWrapper: null,
        videoOnEndWrapper: null,
        highlightWordsInterval: null,
        highlightWord: -1,
        bookClasses: ['front', 'back'],
        turningPageIndex: -1,
        turningPageBackIndex: -1,
        turningPage: false,
        initialized: false,
        paused: false,
        recordMode: recordMode,
        understandMode: understandMode,
        recording: false,
        lastPage: false,
        singleTextAudioPlaying: false,
        pageHasRecording: false,
        mediaPlaying: false,
        lastPage: false,
        playingAll: false,
        recorder: null,
        playingBackRecording: false,
        keyboardInterupt: false,
        playingBackRecording: false,
        pageRecording: new Audio(),
        TTSVoice: "Emma",
        showPlayRecordingsPrompt: false,
        showEndUnderstandMode: false,
        acceptingClicks: false,
        correctWord: null,
        foundAllWords: true,
        vocabPrompts: {
            movingOn: "That is incorrect, Moving on",
            foundAll: "You have found all the words",
            notFoundAll: "You did not find all the words",
            findWord: "Find the word. ",
            findPicture: "find the picture of the. "
        },
        correctPrompt: ["You did it. ", "That is correct"],
        incorrectVocabPrompts: ["No, That is incorrect", "No, Try Again", "Your selection is incorrect"],
    },
    components: {
        'page': Page,
    },
    methods: {
        test: function () {
            return "ok";
        },
        nextPage: function () {
            $('.map-hover-canvas').remove();
            imageMapResize();
            app.initialized = true;
            if (app.recording == true) {
                app.keyboardInterupt = true;
                app.stopRecordingOwnVoice();
                app.recording = false;
            }
            if (!app.turningPage && app.curPage + 1 <= pages.length - 1) {
                if (!app.userRecordings[app.curPage + 1]) {
                    app.pageHasRecording = false;
                } else {
                    app.pageHasRecording = true;
                }
                app.pauseAudio();
                app.pauseVideo();
                app.turningPage = true;
                app.turningPageIndex = app.curPage;
                app.updateProgressBar(app.curPage + 1);
                setTimeout(function () {
                    app.turningPageIndex = -1;
                    $('.page').css('animation-timing-function', 'step-end');
                    app.curPage++;
                    app.curPageText = -1;
                    app.curPageVideo = -1;
                    app.curPageVocab = -1;
                    app.incorrectVocabCount = 0;
                    if (app.video) {
                        app.video.unbind('ended', app.videoOnEndWrapper);
                        app.video.trigger('load');
                    }
                    if (app.curPage == app.pages.length - 1) {
                        app.lastPage = true;
                    }
                    if (!app.userRecordings[app.curPage]) {
                        app.pageHasRecording = false;
                    } else {
                        app.pageHasRecording = true;
                    }
                    if (!app.understandMode) {
                        app.playNextAudio();
                    } else {
                        app.acceptingClicks = false;
                        app.vocabExercise();
                    }
                }, 700);
                setTimeout(function () {
                    app.turningPage = false;
                    $('.page').css('animation-timing-function', 'ease-in-out');
                }, 1600);
            }
        },
        previousPage: function () {
            $('.map-hover-canvas').remove();
            if (!app.turningPage && app.curPage - 1 >= 0) {
                if (!app.userRecordings[app.curPage - 1]) {
                    app.pageHasRecording = false;
                } else {
                    app.pageHasRecording = true;
                }
                app.pauseAudio();
                app.pauseVideo();
                app.turningPage = true;
                app.turningPageBackIndex = app.curPage - 1;
                app.updateProgressBar(app.curPage - 1);
                setTimeout(function () {
                    app.turningPageBackIndex = -1;
                    $('.page').css('animation-timing-function', 'step-end');
                    app.curPage--;
                    app.curPageText = -1;
                    app.curPageVideo = -1;
                    app.curPageVocab = -1;
                    app.incorrectVocabCount = 0;
                    if (app.video) {
                        app.video.unbind('ended', app.videoOnEndWrapper);
                        app.video.trigger('load');
                    }
                    if (app.lastPage == true) {
                        app.lastPage = false;
                    }
                    if (!app.understandMode) {
                        app.playNextAudio();
                    } else {
                        app.acceptingClicks = false;
                        app.vocabExercise();
                    }
                }, 700);
                setTimeout(function () {
                    app.turningPage = false;
                    $('.page').css('animation-timing-function', 'ease-in-out');
                }, 1250);
            }
        },
        updateProgressBar: function (toPage) {
            $('#progress-bar .complete').width($('#progress-bar').width() * ((toPage) / (app.pages.length - 1)));
        },
        playMedia: function () {
            if (!app.understandMode) {
                app.playNextAudio();
            } else {
                //app.vocab = app.pages[app.curPage].vocabulary[app.curPageVocab];
                app.playAudio(app.vocab.recording.src, function () {
                    app.acceptingClicks = true;
                });
            }
        },
        vocabExercise: function () {
            //app.acceptingClicks = false;
            app.curPageVocab++;
            if (app.pages[app.curPage].vocabulary[app.curPageVocab]) {
                app.vocab = app.pages[app.curPage].vocabulary[app.curPageVocab];
                if (app.vocab.type == "word") {
                    app.vocab.recording = new Audio('/tts/?text=' + (app.vocabPrompts.findWord + app.vocab.word) + '&voice=' + app.TTSVoice);
                } else {
                    app.vocab.recording = new Audio('/tts/?text=' + (app.vocabPrompts.findPicture + app.vocab.word) + '&voice=' + app.TTSVoice);
                }
                app.playAudio(app.vocab.recording.src, function () {
                    app.acceptingClicks = true;
                });
            } else {
                app.curPageVocab = -1;
                if (app.lastPage || app.pages.length == 1) {
                    if (app.foundAllWords == true) {
                        var audio = new Audio('/tts/?text=' + app.vocabPrompts.foundAll + '&voice=' + app.TTSVoice);
                    } else {
                        var audio = new Audio('/tts/?text=' + app.vocabPrompts.notFoundAll + '&voice=' + app.TTSVoice);
                    }
                    app.showEndUnderstandMode = true;
                    app.playAudio(audio.src, function () {
                        app.curPageText = -1;
                        app.highlightWord = -1;
                    });
                } else {
                    setTimeout(function () {
                        app.nextPage();
                    }, 700);

                }
            }
        },
        playAudio: function (src, onend) {
            if (app.audioOnEndWrapper) {
                app.audio.removeEventListener('ended', app.audioOnEndWrapper);
            }
            app.audio.src = src;
            if (onend) {
                app.audioOnEndWrapper = function () {
                    app.audio.removeEventListener('ended', app.audioOnEndWrapper);
                    app.audio.pause();
                    app.audio.currentTime = 0;
                    onend();
                }
                app.audio.addEventListener('ended', app.audioOnEndWrapper);
            }
            app.audio.playbackRate = app.audioSpeed;
            app.audio.play();
        },
        playNextAudio: function () {
            $('#replayButton').addClass('disabled-button');
            if (app.pageHasRecording == true) {
                $('#playButton').addClass('disabled-button');
            }
            $('#recordButton').addClass('disabled-button');
            app.mediaPlaying = true;
            if (app.pages[app.curPage].texts.length - 1 >= app.curPageText + 1) {
                if (app.audio) {
                    app.startHighlighting();
                }
                app.curPageText++;
                var audioSrc = app.pages[app.curPage].texts[app.curPageText].audio.recording;
                if (audioSrc) {
                    app.playAudio(audioSrc, function () {
                        app.playNextAudio();
                    });
                } else {
                    app.playNextAudio();
                }
            } else {
                app.stopHighlighting();
                app.curPageText = -1;
                $('#replayButton').removeClass('disabled-button');
                if (app.pageHasRecording == true) {
                    $('#playButton').removeClass('disabled-button');
                }
                $('#recordButton').removeClass('disabled-button');
                if (app.pages[app.curPage].videos) {
                    app.playNextVideo();
                } else app.mediaPlaying = false;
            }
        },
        playNextVideo: function () {
            $('#replayButton').addClass('disabled-button');
            if (app.pageHasRecording == true) {
                $('#playButton').addClass('disabled-button');
            }
            $('#recordButton').addClass('disabled-button');
            if (app.pages[app.curPage].videos.length - 1 >= app.curPageVideo + 1) {
                app.curPageVideo++;
                app.video = $('[play=page-' + app.curPage + '-video-' + app.curPageVideo + ']');
                app.playVideo(function () {
                    app.playNextVideo();
                });
            } else {
                app.curPageVideo = -1;
                app.video = null;
                $('#replayButton').removeClass('disabled-button');
                if (app.pageHasRecording == true) {
                    $('#playButton').removeClass('disabled-button');
                }
                $('#recordButton').removeClass('disabled-button');
                app.mediaPlaying = false;
            }
        },
        playVideo: function (onend) {
            if (app.videoOnEndWrapper) {
                app.video.unbind('ended', app.videoOnEndWrapper);
            }
            if (onend) {
                app.videoOnEndWrapper = function () {
                    app.video.unbind('ended', app.videoOnEndWrapper);
                    app.audio.currentTime = 0;
                    onend();
                }
                app.video.bind('ended', app.videoOnEndWrapper);
            }
            app.video.trigger('play');
        },
        startHighlighting: function () {
            if (!app.highlightWordInterval) {
                app.highlightWordInterval = setInterval(function () {
                    for (var i = app.pages[app.curPage].texts[app.curPageText].audio.meta.length - 1; i >= 0; i--) {
                        if (app.audio.currentTime >= app.pages[app.curPage].texts[app.curPageText].audio.meta[i].time) {
                            app.highlightWord = i;
                            break;
                        }
                    }
                }, 20);
            }
            app.highlightWord = -1;
        },
        stopHighlighting: function () {
            clearInterval(app.highlightWordInterval);
            app.highlightWordInterval = null;
            app.highlightWord = -1;
        },
        getZIndex: function (pageIndex) {
            // if (!app || !app.pages) {
            //     return 1;
            // }
            var max = this.pages.length;
            if (pageIndex == this.turningPageIndex || pageIndex == this.turningPageBackIndex) {
                return max + 1;
            }
            var offset = Math.abs(this.curPage - pageIndex);
            return max - offset;
        },
        pauseClicked: function () {
            if (app.paused) {
                app.pauseAudio();
                app.pauseVideo();
            } else {
                if (app.audio.currentSrc != "") {
                    if (app.understandMode && app.audio.currentTime != 0) {
                        app.audio.play();
                    }
                    if (!app.understandMode) {
                        app.audio.play();
                    }
                }
                if (app.curPageText != -1 && !app.singleTextAudioPlaying) {
                    app.startHighlighting();
                }
                if (app.video) {
                    app.video.trigger('play');
                }
            }
        },
        pauseAudio: function () {
            if (app.audio) {
                app.audio.pause();
            }
            if (!app.singleTextAudioPlaying) {
                app.stopHighlighting();
            }
        },
        pauseVideo: function () {
            if (app.video) {
                app.video.trigger('pause');
            }
        },
        togglePause: function () {
            app.paused = !app.paused;
            app.pauseClicked();
        },
        recordOwnVoice: function () {
            if (!app.recorder) {
                app.initRecorder(app.recordOwnVoice);
                return;
            }
            $('#replayButton').addClass('disabled-button');
            if (app.pageHasRecording == true) {
                $('#playButton').addClass('disabled-button');
            }
            app.recorder.start();
            app.recording = true;
        },
        stopRecordingOwnVoice: function () {
            app.recorder.stop();
            $('#replayButton').removeClass('disabled-button');
            if (app.pageHasRecording == true) {
                $('#playButton').removeClass('disabled-button');
            }
            app.keyboardInterupt = false;
        },
        initRecorder: function (initCallback) {
            app.recorder = new Recorder({
                leaveStreamOpen: true,
                encoderPath: '/static/catalyst/js/encoderWorker.min.js'
            });
            app.recorder.addEventListener('streamReady', function (e) {
                initCallback();
            });
            app.recorder.addEventListener('dataAvailable', function (e) {
                if (app.keyboardInterupt == false) {
                    app.userRecordings[app.curPage] = new Blob([e.detail], {
                        type: 'audio/ogg'
                    });
                    app.pageHasRecording = true;
                    app.playRecording();
                }
            });
            app.recorder.initStream();
        },
        playRecording: function () {
            app.playingBackRecording = true;
            app.recording = true;
            app.playAudio(URL.createObjectURL(app.userRecordings[app.curPage]), function () {
                app.recording = false;
                app.playingBackRecording = false;
                if (app.lastPage == true) {
                    app.showPlayRecordingsPrompt = true;
                }
            });
        },
        playAllRecordings: function () {
            app.showPlayRecordingsPrompt = false;
            $('#replayButton').addClass('disabled-button');
            if (app.pageHasRecording == true) {
                $('#playButton').addClass('disabled-button');
            }
            $('#recordButton').addClass('disabled-button');
            app.resetBook(function () {
                app.readAllTurnPage();
            });
        },
        resetBook: function (onend) {
            app.turningPage = true;
            app.turningPageBackIndex = -1;
            app.updateProgressBar(0);
            setTimeout(function () {
                app.turningPage = false;
                app.turningPageBackIndex = -1;
                app.curPage = 0;
                app.curPageText = -1;
                app.lastPage = false;
                onend();
            }, 700);
        },
        readAllTurnPage: function () {
            if (app.userRecordings[app.curPage]) {
                app.playAudio(URL.createObjectURL(app.userRecordings[app.curPage]), function () {
                    app.turningPage = true;
                    app.turningPageIndex = app.curPage;
                    app.updateProgressBar(app.curPage + 1);
                    setTimeout(function () {
                        app.turningPageIndex = -1;
                        $('.page').css('animation-timing-function', 'step-end');
                        app.curPage++;
                        app.curPageText = -1;
                    }, 1000);
                    setTimeout(function () {
                        app.turningPage = false;
                        $('.page').css('animation-timing-function', 'ease-in-out');
                        if (app.curPage < app.pages.length - 1) {
                            app.readAllTurnPage();
                        }
                        if (app.curPage == app.pages.length - 1) {
                            app.playAudio(URL.createObjectURL(app.userRecordings[app.curPage]), function () {
                                app.lastPage = true;
                                $('#replayButton').removeClass('disabled-button');
                                if (app.pageHasRecording == true) {
                                    $('#playButton').removeClass('disabled-button');
                                }
                                $('#recordButton').removeClass('disabled-button');
                                app.mediaPlaying = false;
                            });
                        }
                    }, 1250);
                }, 1000);
            } else {
                app.turningPage = true;
                setTimeout(function(){
                                    app.turningPageIndex = app.curPage;
                app.updateProgressBar(app.curPage + 1);
                setTimeout(function () {
                    app.turningPageIndex = -1;
                    $('.page').css('animation-timing-function', 'step-end');
                    app.curPage++;
                    app.curPageText = -1;
                },1000);
                setTimeout(function(){
                    app.turningPage = false;
                    $('.page').css('animation-timing-function', 'ease-in-out');
                    if (app.curPage < app.pages.length - 1) {
                        app.readAllTurnPage();
                    }
                    if (app.curPage == app.pages.length - 1) {
                        app.playAudio(URL.createObjectURL(app.userRecordings[app.curPage]), function () {
                            app.lastPage = true;
                            $('#replayButton').removeClass('disabled-button');
                            if (app.pageHasRecording == true) {
                                $('#playButton').removeClass('disabled-button');
                            }
                            $('#recordButton').removeClass('disabled-button');
                            app.mediaPlaying = false;
                        });
                    }
                }, 1250);
            }, 1000);

            }
        },
        playCorrect: function () {
            app.acceptingClicks = false;
            var audio = new Audio('/tts/?text=' + app.correctPrompt[Math.floor(Math.random() * app.correctPrompt.length)] + '&voice=' + app.TTSVoice);
            app.playAudio(audio.src, function () {
                app.curPageText = -1;
                app.highlightWord = -1;
                app.vocabExercise();
            });
        },
        playIncorrect: function () {
            app.acceptingClicks = false;
            if (app.incorrectVocabCount < 5) {
                var audio = new Audio('/tts/?text=' + app.incorrectVocabPrompts[Math.floor(Math.random() * app.incorrectVocabPrompts.length)] + '&voice=' + app.TTSVoice);
            } else {
                var audio = new Audio('/tts/?text=' + app.vocabPrompts.movingOn + '&voice=' + app.TTSVoice);
            }
            if (app.incorrectVocabCount > 2) {
                audio.addEventListener('loadedmetadata', function () {
                    if (app.vocab.type == "word") {
                        $(".word").each(function () {
                            //console.log($(this))
                            var pageIndex = $(this).attr('page');
                            var theStr = $(this).html();
                            theStr = theStr.toLowerCase().replace(/ /g, '');
                            if (theStr == app.vocab.word && pageIndex == app.curPage) {
                                app.correctWord = $(this);
                                //console.log($(this))
                                //console.log(app.vocab.word);
                                app.correctWord.pulse({
                                    times: 5,
                                    duration: audio.duration * 1000 / 8
                                });
                                //$('[word=' + $(this).attr('word') + ']').pulsate();
                                // $('[word=' + $(this).attr('word') + ']').toggleClass('force-highlight');
                            }
                        });
                    } else {
                        $("area").each(function () {
                            //var pageIndex = $(this)[0].parentElement;
                            //pageIndex = pageIndex['page'];
                            var theStr = $(this)[0].dataset.name;
                            theStr = theStr.toLowerCase().replace(/ /g, '');
                            console.log(theStr);
                            if (theStr == app.vocab.word /*&& pageIndex == app.curPage*/ ) {
                                app.correctWord = $(this);
                                app.correctWord.pulse({
                                    times: 5,
                                    duration: audio.duration * 1000 / 8
                                });
                            }
                        });
                    }
                });
            }
            app.playAudio(audio.src, function () {
                app.curPageText = -1;
                app.highlightWord = -1;
                if (app.incorrectVocabCount != 5) {
                    app.curPageVocab--;
                } else {
                    app.foundAllWords = false;
                }
                if (app.incorrectVocabCount > 5) {
                    app.incorrectVocabCount = 0;
                } else {
                    app.incorrectVocabCount++;
                }
                app.vocabExercise();
            });
        },
        startMobile: function(){
            app.mobileStart = false;
            app.curPageText = -1;
            app.playMedia();
        }
    }
});

function setBookSize() {
    var ratio = 4 / 3;
    var windowWidth = $(window).width();
    var windowHeight = $(window).height();
    if (windowWidth / windowHeight >= ratio) {
        // screen is wider than our ratio, snap to height
        bookHeight = windowHeight;
        bookWidth = parseInt(windowHeight * ratio);
    } else {
        // snap to width
        bookWidth = windowWidth;
        bookHeight = parseInt(windowWidth / ratio);
    }
    $('#flip, .content, .cover-page').width(bookWidth);
    $('#flip').height(bookHeight);
    $('#progress-bar').width(bookWidth);
    //$('.page').css('min-width', bookWidth / 2).height(bookHeight);
    $('.page:not(.cover-page)').css('left', bookWidth / 2);
    $('.page:not(.cover-page) .front .content').css('left', -bookWidth / 2);
    //$('#cover-div').width(bookWidth / 2).css('background-position', '-' + (bookWidth * .1225) + 'px');
    //    forwardButton.css({top: 5, right: (windowWidth - bookWidth) / 2 - 100});
    $('#flip').css('font-size', bookWidth * .03);
    $('.button-container-right img').width(bookWidth * .08);
    $('.button-container-right img.pulse').width(bookWidth * .0686);
}
setBookSize();
$(window).resize(function () {
    setBookSize();
});

function renderShape(canvas, mapArea) {
    var context = canvas.getContext('2d');
    var i;
    var cStr = mapArea.coords.split(',');
    var c = [];
    for (var i = 0; i < cStr.length; i++) {
        c.push(parseInt(cStr[i]));
    }
    context.fillStyle = 'rgba(102, 204, 255, .3)';
    context.strokeStyle = 'rgba(102, 204, 255, .3)';
    switch (mapArea.shape) {
        case 'rect':
            context.rect(c[0], c[1], c[2] - c[0], c[3] - c[1]);
            break;
        case 'poly':
            context.beginPath();
            context.moveTo(c[0], c[1]);
            for (i = 2; i < c.length; i += 2) {
                context.lineTo(c[i], c[i + 1]);
            }
            context.lineTo(c[0], c[1]);
            break;
        case 'circ':
        case 'circle':
            context.arc(c[0], c[1], c[2], 0, Math.PI * 2, false);
            break;
    }
    context.stroke();
    context.fill();
}
function highlightMapsWordAudio(word){
    if (app.audio.paused) {
        if(word){
            var elementName = event.target.textContent.toLowerCase().trim();
        }
        else{
            var elementName = event.target.dataset.name.toLowerCase().trim();
        }
        $("area").each(function () {
            if(elementName == $(this)[0].dataset.name){
                highlightMap(this);
            }
        });
        $(".word").each(function () {
            var pageIndex = $(this).attr('page');
            var theStr = $(this).html();
            theStr = theStr.toLowerCase().replace(/ /g, '');
            if (pageIndex == app.curPage && elementName == theStr) {
                $('[word=' + $(this).attr('word') + ']').addClass('force-highlight');
            }
        });
        app.singleTextAudioPlaying = true;
        if(word){
            var audio = new Audio('/tts/?text=' + event.target.textContent + '&voice=' + app.TTSVoice);
        }
        else{
            var audio = new Audio('/tts/?text=' + event.target.dataset.name + '&voice=' + app.TTSVoice);
        }
        app.playAudio(audio.src, function () {
            app.curPageText = -1;
            app.highlightWord = -1;
            $(".word").each(function () {
                var pageIndex = $(this).attr('page');
                if (pageIndex == app.curPage) {
                    $('[word=' + $(this).attr('word') + ']').removeClass('force-highlight');
            }
        });
            app.singleTextAudioPlaying = false;
            $('.map-hover-canvas').remove();
        });
    }
}
function highlightMap(mapObj){
    if(!app.singleTextAudioPlaying){
        var parentName = $(mapObj).parent().attr('name');
        var mapArea = $(mapObj);
        var mapName = $(mapObj)[0].dataset.name;
        $('[usemap="#' + parentName + '"]').each(function (el) {
            var img = $(this);
            var canvas = $('<canvas class="map-hover-canvas"></canvas>');
            img.after(canvas);
            canvas.css({
                'position': 'absolute',
                'top': img.css('top'),
                'left': img.css('left'),
                // this makes mouse events pass through the canvas
                'pointer-events': 'none',
            })
            canvas[0].width = img.width();
            canvas[0].height = img.height();
            canvas.width(img.width());
            canvas.height(img.height());
            renderShape(canvas[0], mapArea[0]);
        });
    }
}
function initImageMapHighlighting() {
    $('area').on('click', function (event) {
        if (app.acceptingClicks && app.understandMode) {
            highlightMap(this);
            if (event.target.dataset.name.toLowerCase().trim() == app.vocab.word && app.vocab.type == "map") {
                app.playCorrect();
            } else {
                app.playIncorrect();
            }
            $('.map-hover-canvas').remove();
        } else if (!app.understandMode) {
            highlightMapsWordAudio(false);
        }
    });
    if(!is_touch_device() && !app.understandMode){
        $('area').on('mouseover', function (event) {
            highlightMap(this);
        });
        $('area').on('mouseout', function (event) {
            if(!app.singleTextAudioPlaying){
                $('.map-hover-canvas').remove();
            }
        });
    }
}
function is_touch_device() {
  return 'ontouchstart' in window;
}
//Document is ready
$(document).ready(function () {
    var book = document.getElementById("flip");
    var hammerCheck = new Hammer(book);
    
    hammerCheck.on("swipeleft", function() {
        app.nextPage();
    });
    hammerCheck.on("swiperight", function() {
        app.previousPage();
    });
    console.log(navigator.mediaDevices);
    imageMapResize();
    initImageMapHighlighting();
    if(!is_touch_device()){
        $('#flip').on('mouseover', '.word', function (event) {
            app.hoverTextIndex = $(this).attr('textIndex');
            app.hoverWordIndex = $(this).attr('wordIndex');
        }).on('mouseout', '.word', function (event) {
            app.hoverTextIndex = -1;
            app.hoverWordIndex = -1;
        });
    }
    $('#flip').on('click', '.word', function (event) {
        if (!app.understandMode) {
            app.curPageText = $(this).attr('textIndex');
            app.highlightWord = $(this).attr('wordIndex');
            highlightMapsWordAudio(true);
        } else {
            if (app.acceptingClicks) {
                if (event.target.textContent.toLowerCase().trim() == app.vocab.word && app.vocab.type == "word") {
                    app.playCorrect();
                } else {
                    app.playIncorrect();
                }
            }
        }

    });
    setTimeout(function () {
        $('#flip').css('visibility', 'visible');
        if (!app.understandMode) {
            app.playNextAudio();
        } else {
            app.vocabExercise();
        }
        setTimeout(function(){
            if(app.audio.paused == true && app.curPageText != -1){
                app.mobileStart = true;
            }
        },200);

    }, 500);
});

$.fn.pulse = function (options) {
    var options = $.extend({
        times: 3,
        duration: 1000
    }, options);

    var period = function (callback) {
        if (app.vocab.type == "map") {
            highlightMap(this);
        } else {
            $(this).addClass("force-highlight")
        }
        $(this).animate({
            opacity: 1
        }, options.duration, function () {
            $(this).animate({
                opacity: 1
            }, options.duration, callback);
            if (app.vocab.type == "map") {
                $('.map-hover-canvas').remove();
            } else {
                $(this).removeClass("force-highlight")
            }
        });
    };
    return this.each(function () {
        var i = +options.times,
            self = this,
            repeat = function () {
                --i && period.call(self, repeat)
            };
        period.call(this, repeat);
    });
};
$(window).bind('keydown', function (e) {
    if (!app.recording) {
        if (e.keyCode == 37) {
            // back
            app.previousPage();
            setBookSize();
        } else if (e.keyCode == 39) {
            // forward
            app.nextPage();
            setBookSize();
        } else if (e.keyCode == 32) {
            // space
            app.pauseClicked();
        }
    }
    //Test for escape exiting out of recording
    if (app.recording) {
        if (e.keyCode == 27) {
            app.stopRecordingOwnVoice();
        }
    }
});
function setButtonActive(button) {
    var src = button.attr('src');
    if (!src.includes('Active.svg') && !src.includes('StopRecording.svg')) {
        button.attr('src', src.replace('.svg', 'Active.svg'));
    }
}

function setButtonUnactive(button) {
    var src = button.attr('src');
    if (src.includes('Active.svg')) {
        button.attr('src', src.replace('Active.svg', '.svg'));
    }
}


$('#speed-control').mouseover(function () {
    $('#multiplier').show();
}).mouseout(function () {
    $('#multiplier').hide();
});


$('.action-button').mouseover(function () {
    setButtonActive($(this));
}).mouseout(function () {
    setButtonUnactive($(this));
});
''