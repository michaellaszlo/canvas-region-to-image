var CanvasRegionToImage = (function () {
  'use strict';

  var width = 400,
      height = 500,
      marqueeOptions = {
        length: 3,  // the length of a marquee stroke, in pixels
        gap: 4,  // the gap between marquee strokes, in pixels
        border: 1,  // the width of the marquee border
        speed: 1/120  // the marquee's linear speed in pixels per millisecond
      };

  // Returns a random RGB string (RGBA if alpha is true).
  function randomColor(alpha) {
    var rgb = [
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255),
      Math.floor(Math.random() * 255)
    ];
    if (alpha) {
      rgb.push(Math.random());
    }
    return 'rgb' + (alpha ? 'a' : '') + '(' + rgb.join(', ') + ')';
  }

  // Paints the given canvas with random circles and rectangles.
  function paintRandomPicture(canvas) {
    var context = canvas.getContext('2d'),
        width = canvas.width,
        height = canvas.height,
        i, x, y, r;
    context.fillStyle = randomColor();
    context.fillRect(0, 0, width, height);
    for (i = 0; i < 300; ++i) {
      x = Math.floor(Math.random() * width);
      y = Math.floor(Math.random() * height);
      r = Math.floor(width/9 + Math.random() * width/4);
      context.fillStyle = randomColor(true);
      context.save();
      context.translate(x, y);
      context.rotate(Math.random() * Math.PI);
      context.scale(1, 0.2 + 1.6*Math.random());
      if (Math.random() < 0.6) {
        context.fillRect(-r/2, -r/2, r/2, r/2);
      } else {
        context.beginPath();
        context.arc(0, 0, r/3, 0, 2 * Math.PI);
        context.fill();
        context.closePath();
      }
      context.restore();
    }
    return canvas;
  }

  // Returns an HTMLCanvasElement for use as a pattern. Although MDN says that
  //  context.createPattern can take ImageData, Chrome does not accept it.
  function makeSwatch(options) {
    var canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        numStripes = 5,
        span = options.length + options.gap,
        swatchSize = 2*span,
        swatchCanvas = document.createElement('canvas'),
        swatchContext = swatchCanvas.getContext('2d'),
        pattern,
        i, j, x;
    document.body.appendChild(canvas);
    canvas.width = canvas.height = numStripes/2 * span;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    for (i = 0; i < 2*numStripes; ++i) {
      x = options.length / 2 + i*span;
      context.moveTo(0, x);
      context.lineTo(x, 0);
    }
    context.closePath();
    context.strokeStyle = '#000';
    context.lineWidth = options.length;
    context.stroke();
    swatchCanvas.width = swatchCanvas.height = swatchSize;
    swatchContext.drawImage(canvas, 2, 2, swatchSize, swatchSize,
        0, 0, swatchSize, swatchSize);
    return swatchCanvas;
  }

  function Marquee(canvas, options) {
    var swatch;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.speed = options.speed;
    this.border = options.border;
    swatch = makeSwatch(options);
    this.pattern = this.context.createPattern(swatch, 'repeat');
    this.patternSize = swatch.width;
  }
  Marquee.prototype.animate = function () {
    var canvas = this.canvas,
        context = this.context,
        self = this;
    function update() {
      var elapsed = Date.now() - self.lapTime,
          s = Math.round(elapsed * self.speed),
          x = self.left,
          y = self.top,
          w = self.width,
          h = self.height,
          laps;
      if (s > self.patternSize) {
        laps = Math.floor(s / self.patternSize);
        s -= laps * self.patternSize;
        self.lapTime += laps * self.patternSize / self.speed;
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (!self.running) {
        return;
      }
      context.translate(-s, 0);
      context.fillStyle = self.pattern;
      context.fillRect(s + x - self.border, y - self.border,
          w + 2*self.border, h + 2*self.border);
      context.clearRect(s + x, y, w, h);
      context.translate(s, 0);
      requestAnimationFrame(update);
    }
    update();
  };
  Marquee.prototype.set = function (x, y, w, h) {
    this.left = x;
    this.top = y;
    this.width = w;
    this.height = h;
    if (!this.running) {
      this.running = true;
      this.lapTime = Date.now();
      this.animate();
    }
  };
  Marquee.prototype.halt = function () {
    this.running = false;
  };

  function load() {
    var targetImage = document.getElementById('targetImage'),
        downloadContainer = document.getElementById('downloadContainer'),
        pictureCanvas = document.getElementById('pictureCanvas'),
        selectCanvas = document.getElementById('selectCanvas'),
        clipCanvas = document.createElement('canvas'),
        clipContext = clipCanvas.getContext('2d'),
        selectMarquee = new Marquee(selectCanvas, marqueeOptions);
    downloadContainer.style.left = width + 25 + 'px';
    downloadContainer.appendChild(clipCanvas);
    pictureCanvas.width = selectCanvas.width = width;
    pictureCanvas.height = selectCanvas.height = height;
    paintRandomPicture(pictureCanvas);
    selectCanvas.onmousedown = function (event) {
      var x0 = Math.max(0, Math.min(event.clientX, width)),
          y0 = Math.max(0, Math.min(event.clientY, height));
      function mousemove(event) {
        var x = Math.max(0, Math.min(event.clientX, width)),
            y = Math.max(0, Math.min(event.clientY, height)),
            dx = x - x0, w = Math.abs(dx),
            dy = y - y0, h = Math.abs(dy);
        clipCanvas.width = w;
        clipCanvas.height = h;
        if (w*h == 0) {
          downloadContainer.style.visibility = 'hidden';
          selectMarquee.halt();
          return;
        }
        selectMarquee.set(Math.min(x0, x), Math.min(y0, y), w, h);
        downloadContainer.style.visibility = 'visible';
        clipContext.drawImage(pictureCanvas,
          x0 + Math.min(0, dx), y0 + Math.min(0, dy), w, h,
          0, 0, w, h);
        downloadContainer.style.visibility = (w*h == 0 ? 'hidden' : 'visible');
        downloadContainer.style.top = Math.min(y0, y) + 'px';
      }
      function mouseup(event) {
        selectCanvas.onmousemove = undefined;
        document.onmouseup = undefined;
        targetImage.src = clipCanvas.toDataURL();
        targetImage.style.display = 'block';
      }
      selectCanvas.onmousemove = mousemove;
      document.onmouseup = mouseup;
      targetImage.style.display = 'none';
      mousemove(event);
    };
  }

  return {
    load: load
  };
})();

onload = CanvasRegionToImage.load;
