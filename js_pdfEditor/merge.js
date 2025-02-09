const fileInputsContainer = document.getElementById('file-inputs-container');
const addMoreButton = document.getElementById('add-more');
const mergeButton = document.getElementById('merge-button');
const downloadButton = document.getElementById('download-button');
const previewContainer = document.getElementById('preview-container');
const pageCountContainer = document.getElementById('page-count-container');

let fileCount = 0;

// Function to create file input with "X" button and number label
function createFileInput() {
    console.log('Creating new file input');
    const container = document.createElement('div');
    container.classList.add('file-input-container');

    // Create number label
    const fileNumber = document.createElement('span');
    fileNumber.classList.add('file-number');
    fileNumber.textContent = fileCount + 1;  // Display file number

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.classList.add('file-input');
    input.dataset.index = fileCount;

    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-btn');
    removeButton.textContent = 'X';
    removeButton.onclick = () => removeFile(input, container);

    container.appendChild(fileNumber);
    container.appendChild(input);
    container.appendChild(removeButton);

    fileInputsContainer.appendChild(container);

    // Add event listener for when a file is selected
    input.addEventListener('change', () => {
        // Show the "X" button when a file is selected
        if (input.files.length > 0) {
            // Immediately update the preview and page count when file is selected
            updatePreview();
        }
    });

    // Increment the file count
    fileCount++;

    // Update the numbering of all file inputs
    updateIndexes();
}

// Add the first two file inputs
createFileInput();
createFileInput();

// Add more file inputs when the button is clicked
addMoreButton.addEventListener('click', () => {
    console.log('Adding more files...');
    createFileInput();
});

// Function to remove a file input and re-index the remaining files
function removeFile(input, container) {
    const indexToRemove = parseInt(input.dataset.index);
    console.log(`Removing file input at index: ${indexToRemove}`);

    // Clear the file input value
    input.value = '';

    // If it's one of the inputs beyond the first two, remove it
    if (indexToRemove >= 2) {
        fileInputsContainer.removeChild(container);
        // Re-index the remaining inputs and update the numbers
        fileCount--;
        updateIndexes();
    } else {
        // Just clear the file input value for the first two files
        input.value = '';
    }

    // Remove the corresponding preview if present
    updatePreview();
}

// Function to update the index of each file input and the displayed numbers
function updateIndexes() {
    console.log('Updating indexes...');
    const inputs = document.querySelectorAll('.file-input');
    const fileNumbers = document.querySelectorAll('.file-number');

    inputs.forEach((input, index) => {
        input.dataset.index = index;
        fileNumbers[index].textContent = index + 1;  // Update the number label
    });
}

// Function to update the preview container and page count
async function updatePreview() {
    console.log('Updating PDF preview...');
    previewContainer.innerHTML = ''; // Clear existing preview
    let totalPages = 0;

    const inputs = document.querySelectorAll('.file-input');
    for (let input of inputs) {
        if (input.files.length > 0) {
            const file = input.files[0];
            const arrayBuffer = await file.arrayBuffer();
            console.log('Rendering file with PDF.js', file.name);

            try {
                const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
                console.log(`PDF loaded, total pages: ${pdfDoc.numPages}`);
                totalPages += pdfDoc.numPages;

                // Render all pages of the PDF
                for (let pageIndex = 0; pageIndex < pdfDoc.numPages; pageIndex++) {
                    const page = await pdfDoc.getPage(pageIndex + 1); // Page indexes are 1-based in PDF.js
                    const canvas = document.createElement('canvas');
                    canvas.classList.add('pdf-preview');
                    previewContainer.appendChild(canvas);

                    // Set up the canvas context for rendering
                    const context = canvas.getContext('2d');
                    const viewport = page.getViewport({ scale: 0.5 });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    // Render the page into the canvas
                    await page.render({ canvasContext: context, viewport }).promise;
                    console.log(`Rendered page ${pageIndex + 1}`);

                    // Add event listener to each canvas preview
                    const canvasPreviews = document.querySelectorAll('.pdf-preview');
                    canvasPreviews.forEach(canvas => {
                        canvas.addEventListener('click', enterViewMode);
                    });
                }
            } catch (error) {
                console.error('Error rendering PDF:', error);
            }
        }
    }

    // Update the total page count display
    pageCountContainer.textContent = `Total Pages: ${totalPages}`;
    console.log(`Total pages in merged PDFs: ${totalPages}`);
}

// Merge PDFs
mergeButton.addEventListener('click', async () => {
    console.log('Merging PDFs...');
    const pdfDocs = [];

    // Collect all files selected by the user
    for (let input of document.querySelectorAll('.file-input')) {
        if (input.files.length > 0) {
            const file = input.files[0];
            const arrayBuffer = await file.arrayBuffer();
            console.log('Reading file:', file.name);

            try {
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                pdfDocs.push(pdfDoc);
                console.log('Added file for merging:', file.name);
            } catch (error) {
                console.error('Error loading PDF:', error);
                alert(`Failed to load PDF: ${file.name}`);
            }
        } else {
            alert('Please select a valid PDF file.');
            return;
        }
    }

    // Proceed if there are PDFs to merge
    if (pdfDocs.length > 0) {
        const mergedPdf = await PDFLib.PDFDocument.create();
        console.log('Created new merged PDF document.');

        // Merge all PDF pages
        for (let pdfDoc of pdfDocs) {
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        // Save the merged PDF as a byte array
        const mergedPdfBytes = await mergedPdf.save();
        const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const mergedUrl = URL.createObjectURL(mergedBlob);

        // Display the "Download" button and make it functional
        downloadButton.style.display = 'inline-block';
        downloadButton.onclick = () => {
            const a = document.createElement('a');
            a.href = mergedUrl;
            a.download = 'merged.pdf';
            a.click();
        };
    }
});

// Function to enter view mode and enlarge the clicked canvas
function enterViewMode(event) {
const canvas = event.target;

// Ensure the clicked element is a canvas with the 'pdf-preview' class
if (canvas.classList.contains('pdf-preview')) {
// Add the view-mode class to the clicked canvas
canvas.classList.add('view-mode');

// Display the background cover
const bgCover = document.querySelector('.bg-cover');
if (bgCover) {
bgCover.style.display = 'block';

// Add event listener to close view mode when clicking the background cover
bgCover.addEventListener('click', exitViewMode);
}

// Create the close button for exiting the view mode
const closeButton = document.createElement('button');
closeButton.textContent = 'Close View Mode';
closeButton.classList.add('close-view-mode');

// Append the close button to the body (or a container)
document.body.appendChild(closeButton);

// Add event listener to close the view mode
closeButton.addEventListener('click', exitViewMode);

// Function to handle exiting view mode
function exitViewMode() {
canvas.classList.remove('view-mode');
closeButton.remove(); // Remove the close button from the page

if (bgCover) {
bgCover.style.display = 'none';
bgCover.removeEventListener('click', exitViewMode); // Clean up event listener
}}}}

// Enable the "Add More Files" button on load
addMoreButton.disabled = false;
