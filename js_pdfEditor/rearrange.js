document.addEventListener('DOMContentLoaded', () => {
    const rearrangeFileInput = document.getElementById('Rearrange-file');
    const rearrangeButton = document.getElementById('Rearrange-button');
    const rearrangePageContainer = document.getElementById('rearrangePageContainer');

    let pdfDoc = null;
    let pageOrder = []; // Store the order of pages


    const clearButton = document.createElement('button');
    clearButton.classList.add('remove-btn');
    clearButton.innerText = 'X';
    rearrangeFileInput.insertAdjacentElement('afterend', clearButton);

    // Clear everything when the clear button is clicked
    clearButton.addEventListener('click', () => {
        rearrangeFileInput.value = ''; // Clear the file input
        rearrangePageContainer.innerHTML = ''; // Remove displayed pages
        pageOrder = []; // Reset page order
        pdfDoc = null; // Clear the PDF data
    });
    // Load PDF and display pages
    rearrangeFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        rearrangePageContainer.innerHTML = ''; // Clear previous content
        rearrangePageContainer.classList.remove('hidden');
        pageOrder = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1); // Initial order of pages

        // Render the pages
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport }).promise;

            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.setAttribute('data-page-number', i);
            img.draggable = true;
            img.classList.add('draggable');

            const imgWrapper = document.createElement('div');
            imgWrapper.classList.add('img-wrapper');
            imgWrapper.appendChild(img);
            rearrangePageContainer.appendChild(imgWrapper);
        }

        enableDragAndDrop();
    });

    // Enable drag-and-drop functionality
    function enableDragAndDrop() {
        let draggedItem = null;

        rearrangePageContainer.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG') {
                draggedItem = e.target;
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        rearrangePageContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        rearrangePageContainer.addEventListener('drop', (e) => {
            e.preventDefault();

            const target = e.target;
            if (target.tagName === 'IMG' && draggedItem) {
                const draggedIndex = pageOrder.indexOf(
                    parseInt(draggedItem.getAttribute('data-page-number'))
                );
                const targetIndex = pageOrder.indexOf(
                    parseInt(target.getAttribute('data-page-number'))
                );

                // Check if the target is a valid drop target and if the dragged item isn't already in that position
                if (draggedIndex !== targetIndex) {
                    // Remove the dragged page from its original position
                    pageOrder.splice(draggedIndex, 1);

                    // Insert the dragged page at the new target position
                    pageOrder.splice(targetIndex, 0, parseInt(draggedItem.getAttribute('data-page-number')));

                    // Reorder images visually
                    rearrangePageContainer.removeChild(draggedItem.closest('.img-wrapper'));
                    const targetWrapper = target.closest('.img-wrapper');

                    if (targetIndex < draggedIndex) {
                        rearrangePageContainer.insertBefore(draggedItem.closest('.img-wrapper'), targetWrapper);
                    } else {
                        rearrangePageContainer.insertBefore(draggedItem.closest('.img-wrapper'), targetWrapper.nextSibling);
                    }
                }
            }
        });
    }

    // Rearrange and save the PDF
    rearrangeButton.addEventListener('click', async () => {
        if (!pdfDoc || pageOrder.length === 0) return;

        const pdfLibDoc = await PDFLib.PDFDocument.create();
        const originalPdfBytes = await rearrangeFileInput.files[0].arrayBuffer();
        const originalPdf = await PDFLib.PDFDocument.load(originalPdfBytes);

        // Reorder pages based on pageOrder
        for (const pageNum of pageOrder) {
            const [copiedPage] = await pdfLibDoc.copyPages(
                originalPdf,
                [pageNum - 1]
            );
            pdfLibDoc.addPage(copiedPage);
        }

        const pdfBytes = await pdfLibDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        // Create a Blob URL
        const blobUrl = URL.createObjectURL(blob);

        // Revoke the previous URL if it exists
        if (window.previousBlobUrl) {
            URL.revokeObjectURL(window.previousBlobUrl);
        }

        // Store the new Blob URL for later revocation
        window.previousBlobUrl = blobUrl;

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'Rearranged_PDF.pdf';
        link.click();
    });
});

let testElements = document.querySelectorAll('.img-wrapper'); // Add the dot for class selection

// Iterate over each .img-wrapper element and add an event listener
testElements.forEach((testElement) => {
    testElement.addEventListener("click", () => {
        console.log("test is clicked");
    });
});


