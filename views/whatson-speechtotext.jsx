/* eslint no-param-reassign: 0 */
import React from 'react';
import Dropzone from 'react-dropzone';
import { Icon, Tabs, Pane, Alert, JsonLink } from 'watson-react-components';
import recognizeMicrophone from 'watson-speech/speech-to-text/recognize-microphone';
import recognizeFile from 'watson-speech/speech-to-text/recognize-file';

import ModelDropdown from './model-dropdown.jsx';
import Transcript from './transcript.jsx';
import SpeakersView from './speaker.jsx';
import JSONView from './json-view.jsx';
import cachedModels from '../src/data/models.json';
import { request } from 'https';

const ERR_MIC_NARROWBAND = 'Microphone transcription cannot accommodate narrowband voice models, please select a broadband one.';

export default React.createClass({
  displayName: 'WhatsonSpeechToText',

  getInitialState() {
    return {
      model: 'en-US_BroadbandModel',
      rawMessages: [],
      formattedMessages: [],
      audioSource: null,
      speakerLabels: false,
      // transcript model and keywords are the state that they were when the button was clicked.
      // Changing them during a transcription would cause a mismatch between the setting sent to the
      // service and what is displayed on the app, and could cause bugs.
      settingsAtStreamStart: {
        model: '',
        keywords: [],
        speakerLabels: false,
      },
      error: null,
    };
  },

  reset() {
    if (this.state.audioSource) {
      this.stopTranscription();
    }
    this.setState({ rawMessages: [], formattedMessages: [], error: null });
  },

  /**
     * The behavior of several of the views depends on the settings when the
     * transcription was started. So, this stores those values in a settingsAtStreamStart object.
     */
  captureSettings() {
    this.setState({
      settingsAtStreamStart: {
        model: this.state.model,
        // keywords: this.getKeywordsArr(),
        speakerLabels: this.state.speakerLabels,
      },
    });
  },

  stopTranscription() {
    if (this.stream) {
      this.stream.stop();
      // this.stream.removeAllListeners();
      // this.stream.recognizeStream.removeAllListeners();
    }
    this.setState({ audioSource: null });
  },

  getRecognizeOptions(extra) {
    // const keywords = this.getKeywordsArr();
    return Object.assign({
      // formats phone numbers, currency, etc. (server-side)
      token: this.state.token,
      smart_formatting: true,
      format: true, // adds capitals, periods, and a few other things (client-side)
      model: this.state.model,
      objectMode: true,
      interim_results: true,
      // note: in normal usage, you'd probably set this a bit higher
      word_alternatives_threshold: 0.01,

      speaker_labels: this.state.speakerLabels,
      // combines speaker_labels and results together into single objects,
      // making for easier transcript outputting
      resultsBySpeaker: this.state.speakerLabels,
      // allow interim results through before the speaker has been determined
      speakerlessInterim: this.state.speakerLabels,
    }, extra);
  },

  isNarrowBand(model) {
    model = model || this.state.model;
    return model.indexOf('Narrowband') !== -1;
  },

  handleMicClick() {
    if (this.state.audioSource === 'mic') {
      this.stopTranscription();
      return;
    }
    this.reset();
    this.setState({ audioSource: 'mic' });

    let text_json_record = []


    // The recognizeMicrophone() method is a helper method provided by the watson-speech package
    // It sets up the microphone, converts and downsamples the audio, and then transcribes it
    // over a WebSocket connection
    // It also provides a number of optional features, some of which are enabled by default:
    //  * enables object mode by default (options.objectMode)
    //  * formats results (Capitals, periods, etc.) (options.format)
    //  * outputs the text to a DOM element - not used in this app because it doesn't play nice
    // with react (options.outputElement)
    //  * a few other things for backwards compatibility and sane defaults
    // In addition to this, it passes other service-level options along to the RecognizeStream that
    // manages the actual WebSocket connection.
    this.handleStream(recognizeMicrophone(this.getRecognizeOptions()));
  },

  handleSample1Click() {
    this.handleSampleClick(1);
  },
  handleSample2Click() {
    this.handleSampleClick(2);
  },

  handleSample1Click() {
    if (this.state.audioSource === 'sample-1') {
      this.stopTranscription();
    }
    else {// LH to do : loop through the this.state.formattedMessages array to get all, currently gets last line of speech(length-1)
      console.log(this.state.formattedMessages[this.state.formattedMessages.length - 1].results[0].alternatives[0].transcript);
      var finalmsg = "";
      var phrase = [];
      let msg = this.state.formattedMessages[this.state.formattedMessages.length - 1].results[0].alternatives[0].transcript;
      var fullmsg = this.state.formattedMessages;
      fullmsg.forEach(function (msg,index) {
        // phrase.push(msg.) = fullmsg[index].results[0].alternatives[0].transcript;
       if ( msg.results[0].final){
        phrase.push(msg.results[0].alternatives[0].transcript);
        
          finalmsg = finalmsg + " " + msg.results[0].alternatives[0].transcript;
       }
      });
      console.log("Save locally");
      confirm("User inputs title via modal!");

      exportJson();

      function exportJson() {
        downloadTextFile('Story.txt', finalmsg)
      }

      function downloadTextFile(filename, text) {
        var element = document.createElement('a');
        element.setAttribute('hidden', '')
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }

      function createAndSendDocument() {
        // Create a new Google Doc named 'Hello, world!'

        var doc = DocumentApp.create('Hello, world!');

        // Access the body of the document, then add a paragraph.
        doc.getBody().appendParagraph('This document was created by Google Apps Script.');

        // Get the URL of the document.
        var url = doc.getUrl();

        // Get the email address of the active user - that's you.
        var email = Session.getActiveUser().getEmail();

        // Get the name of the document to use as an email subject line.
        var subject = doc.getName();

        // Append a new string to the "url" variable to use as an email body.
        var body = 'Link to your doc: ' + url;

        // Send yourself an email with a link to the document.
        GmailApp.sendEmail(email, subject, body);
        console.log("Send to google docs");
        this.dropzone.open();
      }
    }
  },

  handleSample2Click() {
    if (this.state.audioSource === 'sample-2') {
      this.stopTranscription();
    }
    else {
      console.log(this.state.formattedMessages[this.state.formattedMessages.length - 1].results[0].alternatives[0].transcript);

      // data.Events.forEach(function (event, index) {
      //   // console.log(index);
      //   data.Events[index]['formattedStartDate'] = convertDate(data.Events[index]['start_date']);
      //   data.Events[index]['formattedEndDate'] = convertDate(data.Events[index]['end_date']);

      // });

      var fullmsg = this.state.formattedMessages;
      var msg = this.state.formattedMessages[this.state.formattedMessages.length - 1].results[0].alternatives[0].transcript;
      var finalmsg = '';
      var phrase = [];
      fullmsg.forEach(function (msg,index) {
        // phrase.push(msg.) = fullmsg[index].results[0].alternatives[0].transcript;
       if (msg.results[0].final) {
        phrase.push(msg.results[0].alternatives[0].transcript);
        
          finalmsg = finalmsg + " " + msg.results[0].alternatives[0].transcript;
       }
      });


      confirm("User inputs title via modal!");
      let usertitle = "userinputtedtitle";

      exportJson();

      function exportJson() {
        console.log("Post to database");
        console.log(finalmsg);
        let message = {
          title: usertitle,
          words: finalmsg
        };
        $.ajax({
          method: 'POST',
          url: "/saved",
          contentType: "application/json",
          data: JSON.stringify(message)
        }).done(function (data) {
          console.log(data + "saving");
          // location.reload();
        });

      }
      // function saveTextFile(filename, text) {
      //   console.log("insert post here");
      //   var element = document.createElement('a');
      //   element.setAttribute('hidden', '')
      //   element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      //   element.setAttribute('download', filename);
      //   document.body.appendChild(element);
      //   element.click();
      //   document.body.removeChild(element);
      // }
      function createAndSendDocument() {
        // Create a new Google Doc named 'Hello, world!'
        var doc = DocumentApp.create('Hello, world!');

        // Access the body of the document, then add a paragraph.
        doc.getBody().appendParagraph('This document was created by Google Apps Script.');

        // Get the URL of the document.
        var url = doc.getUrl();

        // Get the email address of the active user - that's you.
        var email = Session.getActiveUser().getEmail();

        // Get the name of the document to use as an email subject line.
        var subject = doc.getName();

        // Append a new string to the "url" variable to use as an email body.
        var body = 'Link to your doc: ' + url;

        // Send yourself an email with a link to the document.
        GmailApp.sendEmail(email, subject, body);
        console.log("Send to google docs");
        this.dropzone.open();
      }
    }
  },

  handleUserFile(files) {
    const file = files[0];
    if (!file) {
      return;
    }

    this.reset();

  },

  handleStream(stream) {
    console.log(stream);
    // cleanup old stream if appropriate
    if (this.stream) {
      this.stream.stop();
      this.stream.removeAllListeners();
      this.stream.recognizeStream.removeAllListeners();
    }
    this.stream = stream;
    this.captureSettings();

    // grab the formatted messages and also handle errors and such
    stream.on('data', this.handleFormattedMessage).on('end', this.handleTranscriptEnd).on('error', this.handleError);

    // when errors occur, the end event may not propagate through the helper streams.
    // However, the recognizeStream should always fire a end and close events
    stream.recognizeStream.on('end', () => {
      if (this.state.error) {
        this.handleTranscriptEnd();
      }
    });

    // grab raw messages from the debugging events for display on the JSON tab
    stream.recognizeStream
      .on('message', (frame, json) => this.handleRawMessage({ sent: false, frame, json }))
      .on('send-json', json => this.handleRawMessage({ sent: true, json }))
      .once('send-data', () => this.handleRawMessage({
        sent: true, binary: true, data: true, // discard the binary data to avoid waisting memory
      }))
      .on('close', (code, message) => this.handleRawMessage({ close: true, code, message }));

  },

  handleRawMessage(msg) {
    this.setState({ rawMessages: this.state.rawMessages.concat(msg) });
  },

  handleFormattedMessage(msg) {
    this.setState({ formattedMessages: this.state.formattedMessages.concat(msg) });
  },

  handleTranscriptEnd() {
    // note: this function will be called twice on a clean end,
    // but may only be called once in the event of an error
    this.setState({ audioSource: null });
  },

  componentDidMount() {
    this.fetchToken();
    // tokens expire after 60 minutes, so automatcally fetch a new one ever 50 minutes
    // Not sure if this will work properly if a computer goes to sleep for > 50 minutes
    // and then wakes back up
    // react automatically binds the call to this
    // eslint-disable-next-line
    this.setState({ tokenInterval: setInterval(this.fetchToken, 50 * 60 * 1000) });
  },

  componentWillUnmount() {
    clearInterval(this.state.tokenInterval);
  },

  fetchToken() {
    return fetch('/api/token').then((res) => {
      if (res.status !== 200) {
        throw new Error('Error retrieving auth token');
      }
      return res.text();
    }) // todo: throw here if non-200 status
      .then(token => this.setState({ token })).catch(this.handleError);
  },

  handleModelChange(model) {
    this.reset();
    this.setState({
      model,
      // keywords: this.getKeywords(model),
      speakerLabels: this.supportsSpeakerLabels(model)
    });

    // clear the microphone narrowband error if it's visible and a broadband model was just selected
    if (this.state.error === ERR_MIC_NARROWBAND && !this.isNarrowBand(model)) {
      this.setState({ error: null });
    }

    // clear the speaker_lables is not supported error - e.g.
    // speaker_labels is not a supported feature for model en-US_BroadbandModel
    if (this.state.error && this.state.error.indexOf('speaker_labels is not a supported feature for model') === 0) {
      this.setState({ error: null });
    }
  },

  supportsSpeakerLabels(model) {
    model = model || this.state.model;
    // todo: read the upd-to-date models list instead of the cached one
    return cachedModels.some(m => m.name === model && m.supported_features.speaker_labels);
  },

  handleSpeakerLabelsChange() {
    this.setState({
      speakerLabels: !this.state.speakerLabels,
    });
  },

  getFinalResults() {
    return this.state.formattedMessages.filter(r => r.results &&
      r.results.length && r.results[0].final);
  },

  getCurrentInterimResult() {
    const r = this.state.formattedMessages[this.state.formattedMessages.length - 1];

    // When resultsBySpeaker is enabled, each msg.results array may contain multiple results.
    // However, all results in a given message will be either final or interim, so just checking
    // the first one still works here.
    if (!r || !r.results || !r.results.length || r.results[0].final) {
      return null;
    }
    return r;
  },

  getFinalAndLatestInterimResult() {
    const final = this.getFinalResults();
    const interim = this.getCurrentInterimResult();
    if (interim) {
      final.push(interim);
    }
    return final;
  },

  handleError(err, extra) {
    console.error(err, extra);
    if (err.name === 'UNRECOGNIZED_FORMAT') {
      err = 'Unable to determine content type from file name or header; mp3, wav, flac, ogg, opus, and webm are supported. Please choose a different file.';
    } else if (err.name === 'NotSupportedError' && this.state.audioSource === 'mic') {
      err = 'This browser does not support microphone input.';
    } else if (err.message === '(\'UpsamplingNotAllowed\', 8000, 16000)') {
      err = 'Please select a narrowband voice model to transcribe 8KHz audio files.';
    } else if (err.message === 'Invalid constraint') {
      // iPod Touch does this on iOS 11 - there is a microphone, but Safari claims there isn't
      err = 'Unable to access microphone';
    }
    this.setState({ error: err.message || err });
  },

  render() {
    const buttonsEnabled = !!this.state.token;
    const buttonClass = buttonsEnabled
      ? 'base--button'
      : 'base--button base--button_black';

    let micIconFill = '#000000';
    let micButtonClass = buttonClass;
    if (this.state.audioSource === 'mic') {
      micButtonClass += ' mic-active';
      micIconFill = '#FFFFFF';
    } else if (!recognizeMicrophone.isSupported) {
      micButtonClass += ' base--button_black';
    }

    const err = this.state.error
      ? (
        <Alert type="error" color="red">
          <p className="base--p">{this.state.error}</p>
        </Alert>
      )
      : null;

    const messages = this.getFinalAndLatestInterimResult();
    const micBullet = (typeof window !== 'undefined' && recognizeMicrophone.isSupported) ?
      <li className="base--li">Use your microphone to record audio.</li> :
      <li className="base--li base--p_light">Use your microphone to record audio. (Not supported in current browser)</li>;// eslint-disable-line

    return (

      <Dropzone
        onDropAccepted={this.handleUserFile}
        onDropRejected={this.handleUserFileRejection}
        maxSize={200 * 1024 * 1024}
        accept="audio/wav, audio/mp3, audio/mpeg, audio/l16, audio/ogg, audio/flac, .mp3, .mpeg, .wav, .ogg, .opus, .flac" // eslint-disable-line
        disableClick
        className="dropzone _container _container_large"
        activeClassName="dropzone-active"
        rejectClassName="dropzone-reject"
        ref={(node) => {
          this.dropzone = node;
        }}
      >

        <div className="drop-info-container">
          <div className="drop-info">
            <h1>Drop an audio file here.</h1>
            <p>{'Watson Speech to Text supports .mp3, .mpeg, .wav, .opus, and .flac files up to 200mb.'}</p>
          </div>
        </div>

        <h2 className="base--h2">ChatterDocs</h2>

        <ul className="base--ul">
          {micBullet}
        </ul>

        <div className="flex setup">
          <div className="column">

            <p>Voice Model:
              <ModelDropdown
                model={this.state.model}
                token={this.state.token}
                onChange={this.handleModelChange}
              />
            </p>

          </div>

        </div>


        <div className="flex buttons">

          <button className={micButtonClass} onClick={this.handleMicClick}>
            <Icon type={this.state.audioSource === 'mic' ? 'stop' : 'microphone'} fill={micIconFill} /> Record Audio
          </button>

          <button className={buttonClass} onClick={this.handleSample1Click}>
            <Icon type={this.state.audioSource === 'sample-1' ? 'stop' : 'upload'} /> Download Story
          </button>

          <button className={buttonClass} onClick={this.handleSample2Click}>
            <Icon type={this.state.audioSource === 'sample-2' ? 'stop' : 'upload'} /> Save Story
          </button>

          {/* <button className={buttonClass} onClick={this.handleUploadClick}>
            <Icon type={this.state.audioSource === 'upload' ? 'stop' : 'upload'} /> Upload Audio File
          </button> */}

        </div>

        {err}

        <Tabs selected={0}>
          <Pane label="Text">
            {this.state.settingsAtStreamStart.speakerLabels
              ? <SpeakersView messages={messages} />
              : <Transcript messages={messages} />}
          </Pane>
          <Pane label="JSON">
            <JSONView raw={this.state.rawMessages} formatted={this.state.formattedMessages} />
          </Pane>
        </Tabs>

      </Dropzone>
    );
  },
});
