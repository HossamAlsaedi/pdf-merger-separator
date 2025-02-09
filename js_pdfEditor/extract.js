

const fileInput = document.getElementById('fileInput');
const extractFileInput = document.getElementById('extractFileInput');
const pageInfo = document.getElementById('pageInfo');
const totalPagesSpan = document.getElementById('totalPages');
const fromPageInput = document.getElementById('fromPage');
const toPageInput = document.getElementById('toPage');
const confirmExtractButton = document.getElementById('confirmExtractButton');
let pdfDoc;  // pdf.js document for rendering preview
let pdfLibDoc;  // pdf-lib document for manipulation
let totalPages;



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
    const previewContainer = document.getElementById("extractPagePreviewContainer");
    previewContainer.innerHTML = ''; // Clear previous previews

    let totalPages = 0;

    const fileInput = document.querySelector('#extractFileInput'); // Input for file
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const arrayBuffer = await file.arrayBuffer();
        console.log('Rendering file with PDF.js', file.name);

        try {
            const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            console.log(`PDF loaded, total pages: ${pdfDoc.numPages}`);
            totalPages = pdfDoc.numPages;

            // Render all pages of the PDF
            for (let pageIndex = 0; pageIndex < pdfDoc.numPages; pageIndex++) {
                const page = await pdfDoc.getPage(pageIndex + 1); // Page indexes are 1-based in PDF.js

                // Set up the canvas for rendering
                const canvas = document.createElement('canvas');
                canvas.classList.add('pdf-preview');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 0.5 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // Render the page into the canvas
                await page.render({ canvasContext: context, viewport }).promise;
                console.log(`Rendered page ${pageIndex + 1}`);

                // Add each preview canvas inside a wrapper
                const pagePreview = document.createElement('div');
                pagePreview.classList.add('pdf-page-preview');
                pagePreview.appendChild(canvas);
                previewContainer.appendChild(pagePreview);

                // Add event listener to open view mode when clicking on a page
                canvas.addEventListener('click', enterViewMode);
            }
        } catch (error) {
            console.error('Error rendering PDF:', error);
        }
    }
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
  }
  
  // Function to update preview based on selected page range
  function updatePreviewBasedOnRange() {
    const fromPage = parseInt(fromPageInput.value) || 1;
    const toPage = parseInt(toPageInput.value) || totalPages;
    const previewDivs = document.querySelectorAll('.pdf-page-preview');

    // Hide all previews first
    previewDivs.forEach(div => (div.style.display = 'none'));

    // Show previews within the selected range
    for (let i = fromPage - 1; i < toPage; i++) {
        if (previewDivs[i]) {
            previewDivs[i].style.display = 'block';
        }
    }
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
  
    window.alert('extracted file have been succeed!', 'success');  // Show success message
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
      window.alert('invalid options', 'error');
    }
  });
  
  extractFileInput.addEventListener('change', async () => {
    const file = extractFileInput.files[0];
    if (file) {
      await loadPdfWithJS(file);  // Load the PDF for page preview
      await loadPdfWithLib(file);  // Load PDF for extraction
    }
  });
  

  
  // Optional function to clear PDF state (e.g., reset variables)
  function clearPdfState() {
    // Reset any variables or UI related to the previous PDF (e.g., reset page previews)
    pdfDoc = null;
    pdfLibDoc = null;
    totalPages = 0;
    previewContainer.innerHTML = ``;
    // Add any other necessary resets for your specific case
  }
  


  fromPageInput.addEventListener('input', () => {
    validatePageRangeInputs();
    updatePreviewBasedOnRange();
});

toPageInput.addEventListener('input', () => {
    validatePageRangeInputs();
    updatePreviewBasedOnRange();
});

function validatePageRangeInputs() {
    const fromPage = parseInt(fromPageInput.value) || 1;
    const toPage = parseInt(toPageInput.value) || totalPages;

    if (fromPage < 1) {
        fromPageInput.value = 1;
    }
    if (toPage > totalPages) {
        toPageInput.value = totalPages;
    }
    if (fromPage > toPage) {
        fromPageInput.value = toPage;
    }
}

// Reference to the clear button
const clearFileButton = document.getElementById('clearFileButton');

// Event listener for the clear button
clearFileButton.addEventListener('click', () => {
  // Clear the file input
  extractFileInput.value = '';

  // Clear range inputs
  fromPageInput.value = '';
  toPageInput.value = '';

  // Reset total pages display
  totalPagesSpan.textContent = '0';

  // Hide the page info section
  pageInfo.classList.add('hidden');

  // Clear page previews
  const previewContainer = document.getElementById('extractPagePreviewContainer');
  if (previewContainer) {
    previewContainer.innerHTML = '';
  }

  // Clear PDF-related state variables
  pdfDoc = null;
  pdfLibDoc = null;
  totalPages = 0;

  // Optionally show a success or reset message
  window.alert('All inputs and previews have been cleared!', 'success');
});
