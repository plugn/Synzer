(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var MediatorMixin = require('./MediatorMixin');
var template = require('../tpl/controls.html');

function Controls(el) {
  this.el = el;
  MediatorMixin.call(this);

  this.el.innerHTML = template;
}

Controls.prototype.activate = function() {
  var this_ = this;
  this.el.addEventListener('change', function(e) {
    this_.emit(e.target.name + '-change', e.target.value);
  });

  // senging out initial values
  Array.prototype.forEach.call(this.el.querySelectorAll('[name]'), function(el) {
    if (el.type == 'radio' && el.checked === false) {
      return;
    }
    this_.emit(el.name + '-change', el.value);
  });
}

module.exports = Controls;
},{"../tpl/controls.html":10,"./MediatorMixin":3}],2:[function(require,module,exports){
var Note = require('./Note');
var MediatorMixin = require('./MediatorMixin');

function Keyboard(el) {
  this.el = el;
  this._keysPressed = {};
  MediatorMixin.call(this);
}

Keyboard.prototype.draw = function(lowestNote, highestNote) {
  var key;
  for(var i = lowestNote; i < highestNote; i++) {
    key = document.createElement('div');
    key.dataset.pitch = i;
    key.classList.add('key');
    if (['C#', 'D#', 'F#', 'G#', 'B'].indexOf(new Note(i).letter) > -1) {
      key.classList.add('key-black');
    }
    this.el.appendChild(key);
  }
};

Keyboard.prototype.startMouseListening = function() {
  var this_ = this;

  function pressed(el) {
    if (!el.classList.contains('key'))
      return;
    el.classList.add('pressed');
    this_.emit('notePressed', new Note(el.dataset.pitch));
  }

  function released(el) {
    if (!el.classList.contains('key'))
      return;
    el.classList.remove('pressed');
    this_.emit('noteReleased', new Note(el.dataset.pitch));
  }

  this.el.addEventListener('mousedown', function(e) {
    this_._mouseDown = true;
    pressed(e.target);
  });

  this.el.addEventListener('mouseover', function(e) {
    if (this_._mouseDown) {
      pressed(e.target);
    }
  });

  this.el.addEventListener('mouseleave', function(e) {
    this_._mouseDown = false;
  });

  this.el.addEventListener('mouseout', function(e) {
    if (this_._mouseDown) {
      released(e.target);
    }
  });

  this.el.addEventListener('mouseup', function(e) {
    if (this_._mouseDown) {
      released(e.target);
    }
    this_._mouseDown = false;
  });
};

Keyboard.prototype.on = function(eventName, callback) {
  this._events[eventName] = this._events[eventName] || [];
  this._events[eventName].push(callback);
};

Keyboard.prototype.emit = function(eventName) {
  var args = Array.prototype.slice.call(arguments, 1);

  this._events[eventName].forEach(function(callback) {
    callback.apply(null, args);
  });
};

module.exports = Keyboard;

},{"./MediatorMixin":3,"./Note":4}],3:[function(require,module,exports){
function MediatorMixin() {
  this._events = {};
  this.on = function(eventName, callback) {
    this._events[eventName] = this._events[eventName] || [];
    this._events[eventName].push(callback);
  };

  this.emit = function(eventName) {
    var args = Array.prototype.slice.call(arguments, 1);

    if (this._events[eventName]) {
      this._events[eventName].forEach(function(callback) {
        callback.apply(null, args);
      });
    }
  };
};

module.exports = MediatorMixin;
},{}],4:[function(require,module,exports){
function Note(letterWithOctaveOrPitch) {
  if (!this._parsePitch(letterWithOctaveOrPitch) && !this._parseLetter(letterWithOctaveOrPitch)) {
    throw new Error('Can not parse ' + letterWithOctaveOrPitch);
  }
}

Note.prototype._NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'B', 'H'];

Note.prototype._parsePitch = function(pitch) {
  // 21 == A0
  pitch = parseInt(pitch);
  if (isNaN(pitch) || pitch < 21 || pitch > 108)
    return false;
  
  this.letter = this._NOTES[(pitch - 21 + 9) % 12];
  this.octave = Math.floor((pitch - 12) / 12);
  this.pitch = pitch;
  this.frequency = this._freq(this.pitch);
  return true;
};

Note.prototype._parseLetter = function(letterOctave) {
  var match = letterOctave.match(/([ABCDEFGH]#?)(\d+)/);
  if (!match.length)
    return false;
  this.letter = match[1];
  this.octave = parseInt(match[2]);
  this.pitch = this._NOTES.indexOf(this.letter) + 12 * (this.octave + 1);
  this.frequency = this._freq(this.pitch);
  return true;
};

Note.prototype._freq = function(pitch) {
  return Math.pow(2, (pitch - 20 - 49) / 12) * 440;
};

module.exports = Note;
},{}],5:[function(require,module,exports){
(function (global){
var sawtooth = require('./waveforms/sawtooth');
var square = require('./waveforms/square');
var sine = require('./waveforms/sine');

function Synth() {
  this.context = new global.AudioContext;

  this.oscillators = {};

  this.stereoPanner = this.context.createStereoPanner();
  this.stereoPanner.pan.value = this._pan;
  this.stereoPanner.connect(this.context.destination);

  this.gain = this.context.createGain();
  this.gain.value = this._volume;
  this.gain.connect(this.stereoPanner);
 
  this._waveForm = null;
}

// defaults
Synth.prototype._pan = 0;
Synth.prototype._volume = 0.5;

Synth.prototype.setWaveForm = function(waveForm) {
  this._waveForm = {
    'sawtooth': sawtooth,
    'square': square,
    'sine': sine
  }[waveForm];
};

Synth.prototype.setVolume = function(volume) {
  this.volume = volume;
  this.gain.gain.value = this.volume;
};

Synth.prototype.setPan = function(pan) {
  this.pan = pan;
  this.stereoPanner.pan.value = this.pan;
};

Synth.prototype.play = function(note) {
  var oscillator;
  if (!this.oscillators[note.pitch]) {
    oscillator = this.oscillators[note.pitch] = this.context.createOscillator()
  }

  oscillator.setPeriodicWave(this._waveForm || sine);
  oscillator.frequency.value = note.frequency;
  oscillator.connect(this.gain);
  oscillator.start(0);
};

Synth.prototype.stop = function(note) {
  this.oscillators[note.pitch].stop(0);
  delete this.oscillators[note.pitch];
};

module.exports = Synth;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./waveforms/sawtooth":7,"./waveforms/sine":8,"./waveforms/square":9}],6:[function(require,module,exports){
var Keyboard = require('./Keyboard');
var Controls = require('./Controls');
var Synth = require('./Synth');

var keyboardEl = document.querySelector('.keyboard');
var controlsEl = document.querySelector('.controls');

var synth = new Synth();
var controls = new Controls(controlsEl);

controls.on('wave-form-change', function(type) {
  synth.setWaveForm(type);
});

controls.on('volume-change', function(value) {
  synth.setVolume(value);
});

controls.on('pan-change', function(value) {
  synth.setPan(value);
});

controls.activate();

var keyboard = new Keyboard(keyboardEl);
keyboard.draw(60, 84);
keyboard.startMouseListening();

keyboard.on('notePressed', function(note) {
  synth.play(note);
});

keyboard.on('noteReleased', function(note) {
  synth.stop(note);
});

},{"./Controls":1,"./Keyboard":2,"./Synth":5}],7:[function(require,module,exports){
(function (global){
var context = new global.AudioContext();
var approaches = 128;
var real = new global.Float32Array(approaches);
var imag = new global.Float32Array(approaches);

real[0] = 0.5;
for (var i = 1; i < approaches; i++) {
    imag[i] = 1 / (i * Math.PI);
}

var wave = context.createPeriodicWave(real, imag);

module.exports = wave;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
(function (global){
var context = new global.AudioContext();
var realCoeffs = new global.Float32Array([0,0]);
var imagCoeffs = new global.Float32Array([0,1]);
var wave = context.createPeriodicWave(realCoeffs, imagCoeffs);

module.exports = wave;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
(function (global){
var context = new global.AudioContext();
var approaches = 128;
var real = new global.Float32Array(approaches);
var imag = new global.Float32Array(approaches);

real[0] = 0;
for (var i = 1; i < approaches; i++) {
  imag[i] = i % 2 == 0 ? 0 : 4 / (i * Math.PI);
}

var wave = context.createPeriodicWave(real, imag);

module.exports = wave;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(require,module,exports){
module.exports = "<link rel=\"stylesheet\" href=\"css/controls.css\">\n\n<div class=\"col1-container\">\n  <h3>Tremolo</h3>\n  <label class=\"osc1-depth\">\n    <span>Depth</span>\n    <input type=\"number\" value=\"100\" max=\"100\" min=\"0\">\n  </label>\n  <label class=\"osc1-length\">\n    <span>Freq</span>\n    <input type=\"number\" value=\"2\">\n  </label>\n</div>\n\n<div class=\"col1-container\">\n  <h3>Vibrato</h3>\n  <label class=\"osc1-depth\">\n    <span>Depth</span>\n    <input type=\"number\" value=\"100\" max=\"100\" min=\"0\">\n  </label>\n  <label class=\"osc1-length\">\n    <span>Freq</span>\n    <input type=\"number\" min=\"\" value=\"2\">\n  </label>\n</div>\n\n<div class=\"col1-container\">\n  <h3>Delay</h3>\n  <label class=\"osc1-depth\">\n    <span>Taps</span>\n    <input type=\"number\" value=\"2\" max=\"10\" min=\"0\">\n  </label>\n  <label class=\"osc1-depth\">\n    <span>Feedback</span>\n    <input type=\"number\" value=\"50\" max=\"100\" min=\"0\">\n  </label>\n  <label class=\"osc1-length\">\n    <span>Freq</span>\n    <input type=\"number\" value=\"2\">\n  </label>\n</div>\n\n<div class=\"volume-pan-container col1-container\">\n  <label class=\"volume\">\n    <span>Volume</span>\n    <input class=\"volume\" name=\"volume\" value=\"0.5\" min=\"0\" max=\"1\" step=\"0.1\" type=\"number\">\n  </label>\n  <label class=\"pan\">\n    <span>Pan</span>\n    <input class=\"volume\" name=\"pan\" value=\"0\" min=\"-1\" max=\"1\" step=\"0.1\" type=\"number\">\n  </label>\n</div>\n\n<div class=\"wave-form-container col2-container\">\n  <label class=\"wave-form sine\">\n    <span class=\"img\"></span><br>\n    <input type=\"radio\" name=\"wave-form\" value=\"sine\" checked>\n  </label>\n  <label class=\"wave-form sawtooth\">\n    <span class=\"img\"></span><br>\n    <input type=\"radio\" name=\"wave-form\" value=\"sawtooth\">\n  </label>\n  <label class=\"wave-form square\">\n    <span class=\"img\"></span><br>\n    <input type=\"radio\" name=\"wave-form\" value=\"square\">\n  </label>\n</div>\n";

},{}]},{},[6]);
