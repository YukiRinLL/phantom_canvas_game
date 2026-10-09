(function (root) {
  "use strict";

  function Renderer(context) { this.ctx = context; }
  Renderer.prototype.roundedPanel = function (x, y, width, height, fill, stroke, radius) {
    var ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius || 7);
    ctx.fill();
    ctx.stroke();
  };
  Renderer.prototype.circleAvatar = function (image, x, y, size) {
    var ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#d9b27c";
    ctx.fillRect(x, y, size, size);
    if (image && image.complete && image.naturalWidth > 0) ctx.drawImage(image, x, y, size, size);
    else {
      ctx.fillStyle = "#8b5e3c";
      ctx.beginPath();
      ctx.arc(x + size / 2, y + 18, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + 10, y + 28, size - 20, 20);
    }
    ctx.restore();
    ctx.strokeStyle = "#b67c3e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  };
  root.PhantomRenderer = Renderer;
}(window));
