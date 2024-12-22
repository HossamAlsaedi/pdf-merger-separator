// DOM Elements
const fileInput = document.getElementById('fileInput');
const extractFileInput = document.getElementById('extractFileInput');
const pageInfo = document.getElementById('pageInfo');
const totalPagesSpan = document.getElementById('totalPages');
const fromPageInput = document.getElementById('fromPage');
const toPageInput = document.getElementById('toPage');
const confirmExtractButton = document.getElementById('confirmExtractButton');
const previewContainer = document.getElementById('pagePreviewContainer');
const overlay = document.getElementById('overlay');
const overlayImg = document.getElementById('overlayImg');
const closeOverlayButton = document.getElementById('closeOverlay');

let pdfDoc;  // pdf.js document for rendering preview
let pdfLibDoc;  // pdf-lib document for manipulation
let totalPages;

//------------------------------------------------------------------------------------------------
const fileList = document.getElementById('fileList');
const addFileButton = document.getElementById('addFileButton');
const mergeButton = document.getElementById('mergeButton');
const downloadButton = document.getElementById('downloadButton');
const message = document.getElementById('message');

// Function to show messages
function showMessage(msg, type) {
  message.textContent = msg;
  message.classList.remove('hidden');
  message.style.color = type === 'success' ? 'green' : 'red';
}

// Function to hide messages
function hideMessage() {
  message.textContent = '';
  message.classList.add('hidden');
}

// Add a new file input dynamically for files beyond File 2
function addFileInput() {
  const li = document.createElement('li');
  li.classList.add('file-item');
  const fileIndex = fileList.children.length + 1; // Calculate file index
  li.innerHTML = `
    <label>الملف ${fileIndex}:</label>
    <input type="file" class="fileInput" accept="application/pdf" />
    <button class="remove-btn">X</button>
  `;
  fileList.appendChild(li);

  const newFileInput = li.querySelector('.fileInput');
  const removeButton = li.querySelector('.remove-btn');

  newFileInput.addEventListener('change', validateFiles);
  removeButton.addEventListener('click', () => {
    li.remove();
    updateFileLabels(); // Update file labels after removal
    validateFiles(); // Re-validate files after removal
  });
}

// Update file labels dynamically
function updateFileLabels() {
  document.querySelectorAll('.file-item').forEach((li, index) => {
    const label = li.querySelector('label');
    label.textContent = `الملف ${index + 1}:`;
  });
}

// Enable merge button if at least two files are selected
function validateFiles() {
  const fileInputs = document.querySelectorAll('.fileInput');
  const selectedFiles = Array.from(fileInputs).filter(input => input.files.length > 0);
  mergeButton.disabled = selectedFiles.length < 2;
}

// Add "X" button to clear or remove files
function attachRemoveButtonLogic() {
  document.querySelectorAll('.file-item').forEach((li, index) => {
    let removeButton = li.querySelector('.remove-btn');
    if (!removeButton) {
      removeButton = document.createElement('button');
      removeButton.textContent = 'X';
      removeButton.classList.add('remove-btn');
      li.appendChild(removeButton);
    }

    removeButton.addEventListener('click', () => {
      const fileInput = li.querySelector('.fileInput');
      if (index < 2) {
        // Clear the file input for the first two files
        fileInput.value = '';
      } else {
        // Remove the entire list item for additional files
        li.remove();
        updateFileLabels(); // Update file labels after removal
      }
      validateFiles(); // Re-validate files after clearing/removal
    });
  });
}

// Attach validation to default file inputs
document.querySelectorAll('.fileInput').forEach(input => {
  input.addEventListener('change', validateFiles);
});

// Add dynamic file input on "Add More Files" click
addFileButton.addEventListener('click', () => {
  addFileInput();
  attachRemoveButtonLogic();
});

// Merge multiple PDFs into one
async function mergePdfs() {
  try {
    const fileInputs = document.querySelectorAll('.fileInput');
    const files = Array.from(fileInputs)
      .map(input => input.files[0])
      .filter(file => file); // Ensure only valid files are considered

    if (files.length < 2) {
      showMessage('الرجاء اختيار ملفين على الاقل.', 'error');
      return;
    }

    const mergedPdfDoc = await PDFLib.PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const currentPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdfDoc.copyPages(
        currentPdfDoc,
        currentPdfDoc.getPageIndices()
      );
      copiedPages.forEach(page => mergedPdfDoc.addPage(page));
    }

    // Save the merged PDF and enable the download button
    const mergedPdfBytes = await mergedPdfDoc.save();
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merged.pdf';

    // Enable the download button after merge is complete
    downloadButton.onclick = () => link.click();
    downloadButton.disabled = false;

    showMessage('تمت عملية الدمج بنجاح. اضغط على "تحميل الملف" لتنزيل الملف.', 'success');
  } catch (error) {
    showMessage('حدث خطأ أثناء عملية دمج الملفات ' + error.message, 'error');
  }
}

// Handle merge button click
mergeButton.addEventListener('click', mergePdfs);

// Add initial "X" buttons to existing file inputs
attachRemoveButtonLogic();


//------------------------------------------------------------------------------------------------
// Extract Functions
async function extractAndDownloadPages(pdfLibDoc, fromPage, toPage) {
  // Ensure the page range is correct
  const pageIndices = [];
  for (let i = fromPage; i <= toPage; i++) {
    if (i - 1 >= 0 && i - 1 < pdfLibDoc.getPageCount()) {
      pageIndices.push(i - 1);  // Push valid indices
    }
  }

  // Create a new PDF document where extracted pages will be added
  const extractedPdf = await PDFLib.PDFDocument.create();

  // Extract pages and add them to the new PDF
  const extractedPages = await extractedPdf.copyPages(pdfLibDoc, pageIndices);
  extractedPages.forEach(page => extractedPdf.addPage(page));

  // Save the modified document to a byte array
  const pdfBytes = await extractedPdf.save();

  // Trigger download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  link.download = 'extracted-pages.pdf';
  link.click();
}

// Function to load PDF using PDF.js (for page preview)
async function loadPdfWithJS(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf-lib.min.js';  // Set worker for PDF.js
  
  const arrayBuffer = await file.arrayBuffer();
  pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
  totalPages = pdfDoc.numPages;
  
  totalPagesSpan.textContent = totalPages; // Display total page count
  generatePagePreviews();  // Generate page previews
  pageInfo.classList.remove('hidden');
  
  // Set max page numbers for input fields
  fromPageInput.max = totalPages;
  toPageInput.max = totalPages;
}

// Function to load PDF using PDFLib (for file extraction)
async function loadPdfWithLib(file) {
  const arrayBuffer = await file.arrayBuffer();
  pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer);
  totalPages = pdfLibDoc.getPageCount();
  
  totalPagesSpan.textContent = totalPages; // Update total pages
  pageInfo.classList.remove('hidden');
  
  // Set max page numbers for input fields
  fromPageInput.max = totalPages;
  toPageInput.max = totalPages;
}

// Function to generate page previews
async function generatePagePreviews() {
  previewContainer.innerHTML = '';  // Clear previous previews
  
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);  // Generate array of page numbers
  
  for (let i = 0; i < totalPages; i++) {
    const page = await pdfDoc.getPage(i + 1);  // Get the page (1-based index)
    const viewport = page.getViewport({ scale: 2 });  // Get the viewport with scaling

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render the page to canvas
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    
    const imgElement = document.createElement('img');
    imgElement.src = canvas.toDataURL();
    imgElement.dataset.page = i + 1;  // Store page number
    imgElement.addEventListener('click', () => openPreview(i)); // Open page preview on click

    // // Create a select input for page number
    // const pageNumberInput = document.createElement('select');
    // pageNumberInput.dataset.page = i + 1;

    // Populate select options with page numbers
    // for (let j = 1; j <= totalPages; j++) {
    //   const option = document.createElement('option');
    //   option.value = j;
    //   option.textContent = j;
    //   if (j === i + 1) option.selected = true;  // Mark current page
    //   pageNumberInput.appendChild(option);
    // }

    // Add event listener for page number change
    // pageNumberInput.addEventListener('change', (event) => {
    //   const newPageNumber = parseInt(event.target.value);
    //   updatePageNumber(i, newPageNumber);  // Update page number after change
    // });

    // Add the image and select elements to the page preview
    const pagePreview = document.createElement('div');
    pagePreview.classList.add('page-preview');
    pagePreview.appendChild(imgElement);
    // pagePreview.appendChild(pageNumberInput);
    
    previewContainer.appendChild(pagePreview);  // Append to preview container
  }

  previewContainer.classList.remove('hidden');
}

// Function to update page numbers after drag and drop changes
function updatePageNumber(oldIndex, newPageNumber) {
  const previewDivs = document.querySelectorAll('.page-preview');
  const pagePreviewsArray = Array.from(previewDivs);
  
  // Get the dragged preview and target preview for sorting
  const draggedPreview = pagePreviewsArray[oldIndex];
  
  // Find target preview with the new page number
  const targetPreview = pagePreviewsArray.find((div) => {
    const input = div.querySelector('select');
    return parseInt(input.value) === newPageNumber;
  });
  
  // Insert dragged preview before or after the target preview
  if (targetPreview) {
    previewContainer.insertBefore(draggedPreview, targetPreview);
  } else {
    previewContainer.appendChild(draggedPreview);
  }

  // Update all page numbers after reordering
  updateAllPageNumbers();
}


// Function to update all page numbers after changes
// function updateAllPageNumbers() {
//   const previewDivs = document.querySelectorAll('.page-preview');
//   previewDivs.forEach((div, index) => {
//     const pageNumberInput = div.querySelector('select');
//     pageNumberInput.value = index + 1;  // Correct the page number for the new order
//   });
// }


// Function to update preview based on selected page range
function updatePreviewBasedOnRange() {
  const fromPage = parseInt(fromPageInput.value);
  const toPage = parseInt(toPageInput.value);
  const previewDivs = document.querySelectorAll('.page-preview');
  
  // Hide all previews first
  previewDivs.forEach(div => div.style.display = 'none');
  
  // Show pages within the selected range
  for (let i = fromPage - 1; i < toPage; i++) {
    if (previewDivs[i]) previewDivs[i].style.display = 'block';
  }

  // Update page number inputs based on range
  // updateAllPageNumbers();  // Ensure number update after hiding/unhiding

  // Disable page selectors outside of the visible range
  const pageNumberInputs = document.querySelectorAll('.page-preview select');
  pageNumberInputs.forEach((input, index) => {
    input.disabled = (index < fromPage - 1 || index >= toPage);
  });
}


// Function to extract selected pages from PDF using PDFLib
async function extractPages(pdfLibDoc, fromPage, toPage) {
  const pageIndices = [];
  for (let i = fromPage; i <= toPage; i++) pageIndices.push(i - 1);  // Convert to 0-based indices
  
  const extractedPdf = await PDFLib.PDFDocument.create();
  const extractedPages = await extractedPdf.copyPages(pdfLibDoc, pageIndices);
  extractedPages.forEach(page => extractedPdf.addPage(page));
  
  return extractedPdf;
}

// Function to save the extracted PDF
async function saveExtractedPdf(extractedPdf, fileName) {
  const extractedBytes = await extractedPdf.save();
  const blob = new Blob([extractedBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();  // Trigger download

  showMessage('تمت عملية استخراج وحفظ الملف بنجاح !', 'success');  // Show success message
}

// Event listeners for extracting pages, file input, and page range updates
confirmExtractButton.addEventListener('click', async () => {
  const fromPage = parseInt(fromPageInput.value);
  const toPage = parseInt(toPageInput.value);
  if (fromPage && toPage && fromPage <= toPage) {
    const extractedPages = await extractPages(pdfLibDoc, fromPage, toPage);
    const fileName = `extracted_${fromPage}_to_${toPage}.pdf`;
    await saveExtractedPdf(extractedPages, fileName);
  } else {
    showMessage('تحديد غير صحيح.', 'error');
  }
});


extractFileInput.addEventListener('change', async () => {
  const file = extractFileInput.files[0];
  if (file) {
    await loadPdfWithJS(file);  // Load the PDF for page preview
    await loadPdfWithLib(file);  // Load PDF for extraction
  }
});

fromPageInput.addEventListener('input', updatePreviewBasedOnRange);
toPageInput.addEventListener('input', updatePreviewBasedOnRange);

// Function to open page preview overlay
async function openPreview(pageIndex) {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport: viewport }).promise;

  overlayImg.src = canvas.toDataURL();  // Set image for overlay
  overlay.style.display = 'flex';  // Show overlay
}

// Close overlay event listener
closeOverlayButton.addEventListener('click', () => {
  overlay.style.display = 'none';  // Hide overlay
});

// Function to toggle between list and grid view
function toggleViewMode(mode) {
  if (mode === 'list') {
    previewContainer.classList.remove('grid-view');
    previewContainer.classList.add('list-view');
  } else {
    previewContainer.classList.remove('list-view');
    previewContainer.classList.add('grid-view');
  }
}




