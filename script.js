const textLayer = document.querySelector('#textLayer')
const imageLayer = document.querySelector('#imageLayer')
const watermarkHelper = {
  startPoint: { x: 0, y: 0 },
  finalPoint: { x: 40, y: 40 },
  offsetPoint: { x: 0, y: 0 },
  fontSize: 30,
  fontColor: '#0066cc',
  strokeSize: 5,
  strokeColor: '#ffffff',
}

/**
 * This function check if the provide div contains a CSS color.
 * If not, applies error class to the div
 * @param {Element} sizeDiv - element to get text content from
 * @return the text context of the div
 */
function validateColor(colorDiv) {
  const colorString = colorDiv.textContent
  const temp = new Option().style
  temp.color = colorString
  colorDiv.classList.remove('error')
  if (temp.color === "") colorDiv.classList.add('error')
  return colorString
}

/**
 * This function check if the provide div contains a number.
 * If not, applies error class to the div
 * @param {Element} sizeDiv - element to get text content from
 * @return the text context of the div
 */
function validateNumber(sizeDiv) {
  const sizeString = sizeDiv.textContent
  sizeDiv.classList.remove('error')
  if (isNaN(sizeString)) sizeDiv.classList.add('error')
  return sizeString

}

/**
 * This function checks the color and size configuration.
 * If the configuration are correct, value will be updated to watermarkHelper.
 */
function validateConfiguration() {
  const color = validateColor(document.querySelector('#color'))
  const size = validateNumber(document.querySelector('#size'))
  const sColor =validateColor(document.querySelector('#strokeColor'))
  const sSize =validateNumber(document.querySelector('#strokeSize'))
  if (document.querySelectorAll('.error').length > 0) return false
  watermarkHelper.fontColor = color
  watermarkHelper.fontSize = size
  watermarkHelper.strokeColor = sColor
  watermarkHelper.strokeSize = sSize
  return true
}

/**
 * This function generates a canvas object
 * @param {width, height} - an object that destruct into width and height
 * @returns {Canvas} a new canvas with provided size
 */
function createCanvasWithSize(size) {
  return resizeCanvas(document.createElement('canvas'), size)
}

/**
 * This function resizes a canvas
 * @param {Canvas} canvas - the canvas to resize
 * @param {width, height} - an object that destruct into width and height
 * @returns {Canvas} the provided canvas
 */
function resizeCanvas(canvas, {width, height}) {
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * This function provides a promise to load image
 * @param {string} dataUrl - the url to load image from
 * @return {Promise} a promise that resolves into image object where src is loaded
 */
function waitForImage(dataUrl) {
  const image = new Image()
  image.src = dataUrl
  return new Promise(resolve => image.onload = () => resolve(image))
}

/**
 * This fires a message on the top right
 * @param {string} option.message - the message to display
 */
function notifyUser({message}) {
  Swal.fire({
    width: 350,
    position: 'top-end',
    title: message,
    backdrop: 'none',
    showConfirmButton: false,
    timer: 1500
  })
}

/**
 * This function converts the preview x and y location into percentage,
 * then computes the new x and y location using provided canvas
 * @param {number} x - the preview x location
 * @param {number} y - the preview y location
 * @param {Canvas} canvas - the canvas to compute scaling factors
 * @returns {x, y, scale} factor of new x, y, and scale using height
 */
function getScalingFactors(x, y, canvas) {
  const {width, height} = imageLayer
  return {
    x: canvas.width * (x / width),
    y: canvas.height * (y / height),
    scale: canvas.height / imageLayer.height,
  }
}

/**
 * This function renders the provided text to the provided canvas
 * @param {string} text - the text to render
 * @param {Canvas} canvas - the canvas to render text on
 * @param {boolean} useFinal - if true, use the watermarkHelper.finalPoint, offsetPoint otherwise
 * @param {boolean} applyScalingFactorFromPreview - use relatively scaled location and size for text
 */
function writeTextOnCanvas(text, canvas, useFinal = true, applyScalingFactorFromPreview = false) {
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  let {x, y} = useFinal ? watermarkHelper.finalPoint : watermarkHelper.offsetPoint
  let strokeSize = watermarkHelper.strokeSize
  let fontSize = watermarkHelper.fontSize
  if (applyScalingFactorFromPreview) {
    const factor = getScalingFactors(x, y, canvas)
    x = factor.x
    y = factor.y
    strokeSize *= factor.scale
    fontSize *= factor.scale
  }
  context.font = `${fontSize}px Noto Sans TC`
  context.strokeStyle = watermarkHelper.strokeColor
  context.fillStyle = watermarkHelper.fontColor  
  context.lineWidth = strokeSize
  const lineHeight = fontSize * 1.2
  text.split('\n').filter(string => string !== "").forEach((string, index) => {
    context.strokeText(string, x, y + index * lineHeight)
    context.fillText(string, x, y + index * lineHeight)
  })
}

/**
 * This function generates the preview image using the first file from the selected files
 * The #textLayer and #imageLayer will be resize to fit the image
 */
function previewFile() {
  const files = document.querySelector('#files').files
  if (files.length === 0) return notifyUser({message: '請選擇檔案'})
  const textCanvas = textLayer
  const imageCanvas = imageLayer
  const imageContext = imageCanvas.getContext('2d')
  // Make preview image
  const reader = new FileReader()
  reader.addEventListener('load', async () => {
    const image = new Image()
    image.src = reader.result
    image.onload = () => {
      const size = { width: image.width, height: image.height }
      if (image.width > 450) {
        size.width = 450
        size.height = image.height / (image.width / 450)
      }
      resizeCanvas(textCanvas, size)
      resizeCanvas(imageCanvas, size)
      imageContext.drawImage(image, 
        0, 0, image.width, image.height,
        0, 0, size.width, size.height,
      )
      previewWaterMark(true)
    }
  });
  reader.readAsDataURL(files[0])
}

/**
 * This function loads the provide image into a canvas
 * @param {string} imageSrc - the DataURL to load as image
 * @returns {Promise} a promise that resolves into a canvas
 */
function loadImageIntoCanvas(imageSrc){
  return new Promise((resolve, reject) => {
    const image = new Image()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    image.src = imageSrc;
    image.onload = function() {
      resizeCanvas(canvas, this)
      context.drawImage(image, 0, 0)
      resolve(canvas)
    }
  });
}

/**
 * This function resets the #textLayer, then add text from #watermark to #textLayer
 * It will be use as a visual indicator of the watermark style
 */
function previewWaterMark(useFinal) {
  if (!validateConfiguration()) return;
  const text = document.querySelector('#watermark').innerText
  writeTextOnCanvas(text, textLayer, useFinal)
}

/**
 * This function loads all provided files into a pair object
 * @returns {Promise[]} array of promises that resolves into an object of {filename, canvas}
 */
function loadAllImages(files) {
  const filenameCanvasPairPromises = Array.from(files).map(file => 
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', async () => {
          const canvas = await loadImageIntoCanvas(reader.result)
          resolve({filename: file.name, canvas})
      });
      reader.readAsDataURL(file)
    })
  )
  return filenameCanvasPairPromises
}

/**
 * This function gets all the files from #files, load them into canvas, 
 * apply watermarks, then generate as a zip file for download
 */
async function downloadZip() {
  const files = document.querySelector('#files').files
  const filenameCanvasPairs = await Promise.all(loadAllImages(files))
  const zip = new JSZip()
  const watermarkPromises = filenameCanvasPairs.map((pair) => applyWaterMark(pair.canvas, pair.filename))
  const watermarkedFilenameCanvasPairs = await Promise.all(watermarkPromises)
  watermarkedFilenameCanvasPairs.forEach(async ({canvas, filename}) => {
      const dataUrl = canvas.toDataURL('image/jpeg').replace('data:image/jpeg;base64,', '')
      zip.file(filename, dataUrl, {base64: true})
  })
  const content = await zip.generateAsync({type:"blob"})
  const downloadTag = document.createElement('a')
  downloadTag.href = URL.createObjectURL(content)
  downloadTag.click()
}

/**
 * This function generates a canvas with watermark using the provided canvas and #watermark
 * @param {Canvas} baseImageCanvas - the canvas to use as the base image
 * @param {string} filename - filename to return as pair
 * @return {canvas, filename} a pair of canvas and filename
 */
async function applyWaterMark(baseImageCanvas, filename) {
  const text = document.querySelector('#watermark').innerText
  const textImageCanvas = createCanvasWithSize(baseImageCanvas)
  writeTextOnCanvas(text, textImageCanvas, true, true)
  const baseWait = waitForImage(baseImageCanvas.toDataURL())
  const textWait = waitForImage(textImageCanvas.toDataURL())
  const [baseImage, textImage] = await Promise.all([baseWait, textWait])

  const resultCanvas = createCanvasWithSize(baseImageCanvas)
  const resultContext = resultCanvas.getContext('2d')
  resultContext.drawImage(baseImage, 0, 0)
  resultContext.drawImage(textImage, 0, 0)
  return {canvas: resultCanvas, filename}
}

/**
 * This function moves the preview text using the new mouse location,
 * and updates the textMoveHelper.offsetPoint to this new offset location.
 * @param {Event} moveEvent - the event to provide mouse location
 */
const mouseMoveHandler = (moveEvent) => {
  const start = watermarkHelper.startPoint
  const final = watermarkHelper.finalPoint
  watermarkHelper.offsetPoint = {
    x: final.x + (moveEvent.x - start.x),
    y: final.y + (moveEvent.y - start.y),
  }
  previewWaterMark(false)
}

/**
 * This event listener starts a listener for mouse moving of preview text.
 */
textLayer.addEventListener('mousedown', (downEvent) => {
  watermarkHelper.startPoint.x = downEvent.x
  watermarkHelper.startPoint.y = downEvent.y
  if (!validateConfiguration()) return;
  textLayer.addEventListener('mousemove', mouseMoveHandler)
});

/**
 * This event listener finalizes the location of the preview text,
 * and stops the move listener
 */
textLayer.addEventListener('mouseup', (upEvent) => {
  textLayer.removeEventListener('mousemove', mouseMoveHandler)
  watermarkHelper.finalPoint = watermarkHelper.offsetPoint
})

