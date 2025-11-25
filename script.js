document.addEventListener("DOMContentLoaded", () => {
    // Get all input elements
    const widthInput = document.getElementById("size-width");
    const heightInput = document.getElementById("size-height");
    const rowsInput = document.getElementById("layout-rows");
    const columnsInput = document.getElementById("layout-columns");
    const gridContainer = document.querySelector(".grid-c");
    const copyBtn = document.getElementById("btn-copy");
    const resetBtn = document.getElementById("btn-reset");
    
    // Get checkboxes
    const gapCheckbox = document.querySelector('input[name="option-gap"]');
    const strokeCheckbox = document.querySelector('input[name="option-stroke"]');
    const safeAreaCheckbox = document.querySelector('input[name="option-safe-area"]');
    
    // State management
    let selectedBoxes = []; // Stores [row, col] of selected boxes
    let mergedAreas = []; // Stores merged areas as { startRow, startCol, endRow, endCol, id }
    let gridState = []; // 2D array to track grid state
    
    // Set checkboxes to default state (gap checked, others unchecked)
    if (gapCheckbox) gapCheckbox.checked = true;
    if (strokeCheckbox) strokeCheckbox.checked = false;
    if (safeAreaCheckbox) safeAreaCheckbox.checked = false;
    
    // Expand all dropdowns by default
    const dropdowns = document.querySelectorAll('.menu-dropdown');
    dropdowns.forEach(dropdown => {
        const header = dropdown.querySelector('.h-flex');
        const menuWrapper = dropdown.querySelector('.dropdown-menu_w');
        
        // Set dropdowns to expanded state on load
        if (menuWrapper) {
            menuWrapper.classList.add('active');
            const arrow = header?.querySelector('svg');
            if (arrow) {
                arrow.style.transform = 'rotate(180deg)';
            }
        }
        
        if (header) {
            header.addEventListener('click', () => {
                if (menuWrapper) {
                    const isOpen = menuWrapper.classList.contains('active');
                    if (isOpen) {
                        menuWrapper.classList.remove('active');
                    } else {
                        // Close other dropdowns
                        document.querySelectorAll('.dropdown-menu_w').forEach(menu => {
                            menu.classList.remove('active');
                        });
                        menuWrapper.classList.add('active');
                    }
                    
                    // Rotate arrow
                    const arrow = header.querySelector('svg');
                    if (arrow) {
                        arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                    }
                }
            });
        }
    });
    
    // Function to calculate border radius based on shortest side
    function calculateBorderRadius(gridHeight, gridWidth) {
        const shortestSide = Math.min(gridHeight, gridWidth);
        if (shortestSide < 250) return 8;
        if (shortestSide >= 250 && shortestSide < 500) return 16;
        if (shortestSide >= 500 && shortestSide < 750) return 20;
        return 20;
    }
    
    // Function to calculate gap
    function calculateGap(gridHeight, gridWidth) {
        if (!gapCheckbox || !gapCheckbox.checked) {
            // No gap when checkbox is unchecked
            return 0;
        }
        // Gap is enabled when checkbox is checked
        const shortestSide = Math.min(gridHeight, gridWidth);
        if (shortestSide < 250) return 1;
        if (shortestSide >= 250 && shortestSide < 500) return 2;
        if (shortestSide >= 500 && shortestSide < 750) return 4;
        return 6;
    }
    
    // Function to calculate responsive scale factor
    function calculateResponsiveScale(gridHeight, gridWidth) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate available space (accounting for navigation and padding)
        const availableWidth = viewportWidth * 0.8;
        const availableHeight = viewportHeight * 0.75;
        
        const scaleX = availableWidth / gridWidth;
        const scaleY = availableHeight / gridHeight;
        
        const scaleFactor = Math.min(scaleX, scaleY, 1); // Never scale up
        return Math.max(scaleFactor, 0.1); // Minimum scale of 10%
    }
    
    // Function to update visual properties without resetting grid state
    function updateVisualProperties() {
        const gridHeight = parseInt(heightInput.value);
        const gridWidth = parseInt(widthInput.value);
        
        if (isNaN(gridHeight) || isNaN(gridWidth)) return;
        
        const existingGrid = gridContainer.querySelector('.bento-grid');
        if (!existingGrid) return;
        
        const numRows = parseInt(rowsInput.value);
        const numCols = parseInt(columnsInput.value);
        
        if (isNaN(numRows) || isNaN(numCols)) return;
        
        const borderRadius = calculateBorderRadius(gridHeight, gridWidth);
        const gap = calculateGap(gridHeight, gridWidth);
        const scaleFactor = calculateResponsiveScale(gridHeight, gridWidth);
        
        // Calculate exact cell dimensions
        const cellWidth = (gridWidth - (numCols - 1) * gap) / numCols;
        const cellHeight = (gridHeight - (numRows - 1) * gap) / numRows;
        
        // Update grid dimensions
        existingGrid.style.width = `${gridWidth}px`;
        existingGrid.style.height = `${gridHeight}px`;
        existingGrid.style.gridTemplateRows = `repeat(${numRows}, ${cellHeight}px)`;
        existingGrid.style.gridTemplateColumns = `repeat(${numCols}, ${cellWidth}px)`;
        existingGrid.style.gap = `${gap}px`;
        existingGrid.style.transform = `scale(${scaleFactor})`;
        existingGrid.style.transformOrigin = 'center center';
        
        // Update border radius and stroke for all boxes
        const boxes = existingGrid.querySelectorAll('.bento-box');
        boxes.forEach(box => {
            box.style.borderRadius = `${borderRadius}px`;
            if (strokeCheckbox && strokeCheckbox.checked) {
                box.style.border = '1px solid var(--colors--01)';
            } else {
                box.style.border = 'none';
            }
        });
        
        // Update safe area overlays
        updateSafeAreaOverlays();
    }
    
    // Function to update safe area overlays
    function updateSafeAreaOverlays() {
        // Remove existing safe area overlays
        const existingOverlays = gridContainer.querySelectorAll('.safe-area-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
        
        if (!safeAreaCheckbox || !safeAreaCheckbox.checked) return;
        
        const existingGrid = gridContainer.querySelector('.bento-grid');
        if (!existingGrid) return;
        
        const gridHeight = parseInt(heightInput.value);
        const gridWidth = parseInt(widthInput.value);
        const numRows = parseInt(rowsInput.value);
        const numCols = parseInt(columnsInput.value);
        const gap = calculateGap(gridHeight, gridWidth);
        const safeAreaInset = 15;
        
        // Calculate base box dimensions
        const baseBoxWidth = (gridWidth - (numCols - 1) * gap) / numCols;
        const baseBoxHeight = (gridHeight - (numRows - 1) * gap) / numRows;
        
        // Create safe area overlays
        const boxes = existingGrid.querySelectorAll('.bento-box');
        boxes.forEach(box => {
            const row = parseInt(box.dataset.row);
            const col = parseInt(box.dataset.col);
            
            // Check if this box is part of a merged area
            let isPartOfMergedArea = false;
            let mergedArea = null;
            
            for (const area of mergedAreas) {
                if (row >= area.startRow && row <= area.endRow && 
                    col >= area.startCol && col <= area.endCol) {
                    isPartOfMergedArea = true;
                    mergedArea = area;
                    break;
                }
            }
            
            // Only create safe area for the top-left box of merged areas
            if (isPartOfMergedArea) {
                if (row !== mergedArea.startRow || col !== mergedArea.startCol) {
                    return; // Skip non-top-left boxes
                }
                
                // Calculate merged box dimensions
                const mergedBoxWidth = mergedArea.endCol - mergedArea.startCol + 1;
                const mergedBoxHeight = mergedArea.endRow - mergedArea.startRow + 1;
                
                const x = mergedArea.startCol * (baseBoxWidth + gap);
                const y = mergedArea.startRow * (baseBoxHeight + gap);
                const width = mergedBoxWidth * baseBoxWidth + (mergedBoxWidth - 1) * gap;
                const height = mergedBoxHeight * baseBoxHeight + (mergedBoxHeight - 1) * gap;
                
                const safeWidth = Math.max(0, width - (safeAreaInset * 2));
                const safeHeight = Math.max(0, height - (safeAreaInset * 2));
                
                if (safeWidth > 0 && safeHeight > 0) {
                    const safeAreaOverlay = document.createElement('div');
                    safeAreaOverlay.classList.add('safe-area-overlay');
                    safeAreaOverlay.style.position = 'absolute';
                    safeAreaOverlay.style.left = `${x + safeAreaInset}px`;
                    safeAreaOverlay.style.top = `${y + safeAreaInset}px`;
                    safeAreaOverlay.style.width = `${safeWidth}px`;
                    safeAreaOverlay.style.height = `${safeHeight}px`;
                    safeAreaOverlay.style.border = '1px solid var(--colors--01)';
                    safeAreaOverlay.style.backgroundColor = 'transparent';
                    safeAreaOverlay.style.pointerEvents = 'none';
                    safeAreaOverlay.style.zIndex = '10';
                    
                    existingGrid.appendChild(safeAreaOverlay);
                }
            } else {
                // Individual box
                const x = col * (baseBoxWidth + gap);
                const y = row * (baseBoxHeight + gap);
                
                const safeWidth = Math.max(0, baseBoxWidth - (safeAreaInset * 2));
                const safeHeight = Math.max(0, baseBoxHeight - (safeAreaInset * 2));
                
                if (safeWidth > 0 && safeHeight > 0) {
                    const safeAreaOverlay = document.createElement('div');
                    safeAreaOverlay.classList.add('safe-area-overlay');
                    safeAreaOverlay.style.position = 'absolute';
                    safeAreaOverlay.style.left = `${x + safeAreaInset}px`;
                    safeAreaOverlay.style.top = `${y + safeAreaInset}px`;
                    safeAreaOverlay.style.width = `${safeWidth}px`;
                    safeAreaOverlay.style.height = `${safeHeight}px`;
                    safeAreaOverlay.style.border = '1px solid var(--colors--01)';
                    safeAreaOverlay.style.backgroundColor = 'transparent';
                    safeAreaOverlay.style.pointerEvents = 'none';
                    safeAreaOverlay.style.zIndex = '10';
                    
                    existingGrid.appendChild(safeAreaOverlay);
                }
            }
        });
    }
    
    // Function to create or update the grid
    function updateGrid() {
        const gridHeight = parseInt(heightInput.value);
        const gridWidth = parseInt(widthInput.value);
        const numRows = parseInt(rowsInput.value);
        const numCols = parseInt(columnsInput.value);
        
        if (isNaN(gridHeight) || isNaN(gridWidth) || isNaN(numRows) || isNaN(numCols) ||
            numRows <= 0 || numCols <= 0) {
            gridContainer.innerHTML = "<p>Please enter valid numbers.</p>";
            return;
        }
        
        // Calculate dynamic values
        const borderRadius = calculateBorderRadius(gridHeight, gridWidth);
        const gap = calculateGap(gridHeight, gridWidth);
        const scaleFactor = calculateResponsiveScale(gridHeight, gridWidth);
        
        // Clear previous grid
        gridContainer.innerHTML = "";
        selectedBoxes = [];
        mergedAreas = [];
        
        // Create grid element
        const grid = document.createElement("div");
        grid.classList.add("bento-grid");
        
        // Calculate exact cell dimensions
        const cellWidth = (gridWidth - (numCols - 1) * gap) / numCols;
        const cellHeight = (gridHeight - (numRows - 1) * gap) / numRows;
        
        // Set grid dimensions
        grid.style.width = `${gridWidth}px`;
        grid.style.height = `${gridHeight}px`;
        grid.style.display = 'grid';
        grid.style.gridTemplateRows = `repeat(${numRows}, ${cellHeight}px)`;
        grid.style.gridTemplateColumns = `repeat(${numCols}, ${cellWidth}px)`;
        grid.style.gap = `${gap}px`;
        grid.style.transform = `scale(${scaleFactor})`;
        grid.style.transformOrigin = 'center center';
        grid.style.position = 'relative';
        
        // Initialize grid state
        gridState = Array(numRows)
            .fill(null)
            .map(() =>
                Array(numCols)
                    .fill(null)
                    .map(() => ({
                        element: null,
                        merged: false,
                        id: null,
                    }))
            );
        
        // Create boxes
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                const box = document.createElement("div");
                box.classList.add("bento-box");
                box.dataset.row = r;
                box.dataset.col = c;
                box.style.gridRow = `${r + 1}`;
                box.style.gridColumn = `${c + 1}`;
                box.style.borderRadius = `${borderRadius}px`;
                box.style.backgroundColor = 'var(--colors--lime)';
                box.style.cursor = 'pointer';
                
                if (strokeCheckbox && strokeCheckbox.checked) {
                    box.style.border = '1px solid var(--colors--01)';
                }
                
                grid.appendChild(box);
                gridState[r][c].element = box;
                
                box.addEventListener("click", () => handleBoxClick(r, c));
            }
        }
        
        gridContainer.appendChild(grid);
        updateSafeAreaOverlays();
    }
    
    // Handle box click
    function handleBoxClick(row, col) {
        const clickedBox = gridState[row][col].element;
        
        if (gridState[row][col].merged) {
            // If clicking on a merged box, select/deselect the whole area
            const mergedId = gridState[row][col].id;
            const mergedArea = mergedAreas.find((area) => area.id === mergedId);
            
            if (!mergedArea) return;
            
            // Check if already selected
            const isAlreadySelected = selectedBoxes.length > 0 && 
                selectedBoxes.every(([r, c]) => 
                    r >= mergedArea.startRow && r <= mergedArea.endRow &&
                    c >= mergedArea.startCol && c <= mergedArea.endCol
                ) &&
                selectedBoxes.length === (mergedArea.endRow - mergedArea.startRow + 1) * (mergedArea.endCol - mergedArea.startCol + 1);
            
            if (isAlreadySelected) {
                // Deselect
                selectedBoxes.forEach(([r, c]) => {
                    gridState[r][c].element.classList.remove("selected");
                });
                selectedBoxes = [];
            } else {
                // Select all boxes in merged area
                selectedBoxes.forEach(([r, c]) => {
                    gridState[r][c].element.classList.remove("selected");
                });
                selectedBoxes = [];
                
                for (let r = mergedArea.startRow; r <= mergedArea.endRow; r++) {
                    for (let c = mergedArea.startCol; c <= mergedArea.endCol; c++) {
                        gridState[r][c].element.classList.add("selected");
                        selectedBoxes.push([r, c]);
                    }
                }
            }
            return;
        }
        
        // Toggle selection
        if (clickedBox.classList.contains("selected")) {
            clickedBox.classList.remove("selected");
            selectedBoxes = selectedBoxes.filter(
                (box) => !(box[0] === row && box[1] === col)
            );
        } else {
            clickedBox.classList.add("selected");
            selectedBoxes.push([row, col]);
            
            if (selectedBoxes.length === 2) {
                attemptMerge();
            } else if (selectedBoxes.length > 2) {
                attemptMerge();
            }
        }
    }
    
    // Attempt to merge selected boxes
    function attemptMerge() {
        if (selectedBoxes.length < 2) return;
        
        // Sort selected boxes
        selectedBoxes.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;
        
        selectedBoxes.forEach(([r, c]) => {
            minRow = Math.min(minRow, r);
            maxRow = Math.max(maxRow, r);
            minCol = Math.min(minCol, c);
            maxCol = Math.max(maxCol, c);
        });
        
        const numSelectedRows = maxRow - minRow + 1;
        const numSelectedCols = maxCol - minCol + 1;
        const expectedBoxCount = numSelectedRows * numSelectedCols;
        
        // Check if selection forms a rectangle
        let formsRectangle = true;
        if (selectedBoxes.length === expectedBoxCount) {
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    const isSelected = selectedBoxes.some(
                        (box) => box[0] === r && box[1] === c
                    );
                    if (!isSelected) {
                        formsRectangle = false;
                        break;
                    }
                }
                if (!formsRectangle) break;
            }
        } else {
            formsRectangle = false;
        }
        
        // Expand selection to rectangle if needed
        if (!formsRectangle) {
            let newSelectedBoxes = [];
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    newSelectedBoxes.push([r, c]);
                }
            }
            selectedBoxes = newSelectedBoxes;
        }
        
        // Check if can merge
        let canMerge = true;
        let firstBoxMergedId = null;
        if (gridState[selectedBoxes[0][0]][selectedBoxes[0][1]].merged) {
            firstBoxMergedId = gridState[selectedBoxes[0][0]][selectedBoxes[0][1]].id;
        }
        
        for (const [r, c] of selectedBoxes) {
            if (gridState[r][c].merged) {
                if (firstBoxMergedId === null) {
                    canMerge = false;
                    break;
                } else if (gridState[r][c].id !== firstBoxMergedId) {
                    canMerge = false;
                    break;
                }
            }
        }
        
        if (canMerge) {
            const mergedId = firstBoxMergedId || `merged-${Date.now()}`;
            
            if (firstBoxMergedId) {
                mergedAreas = mergedAreas.filter((area) => area.id !== firstBoxMergedId);
            }
            
            const newMergedArea = {
                id: mergedId,
                startRow: minRow,
                startCol: minCol,
                endRow: maxRow,
                endCol: maxCol,
            };
            mergedAreas.push(newMergedArea);
            
            applyMergeToDOM(newMergedArea);
        } else {
            // Cannot merge
            selectedBoxes.forEach(([r, c]) => {
                gridState[r][c].element.classList.remove("selected");
            });
            selectedBoxes = [];
        }
    }
    
    // Apply merge to DOM
    function applyMergeToDOM(mergedArea) {
        const numRows = parseInt(rowsInput.value);
        const numCols = parseInt(columnsInput.value);
        
        // Reset all boxes
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                gridState[r][c].element.classList.remove("selected");
                gridState[r][c].element.style.display = "";
                gridState[r][c].element.style.gridArea = "";
            }
        }
        
        // Apply merged state
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                let isPartOfAnyMergedArea = false;
                let foundMergedArea = null;
                
                for (const area of mergedAreas) {
                    if (r >= area.startRow && r <= area.endRow &&
                        c >= area.startCol && c <= area.endCol) {
                        isPartOfAnyMergedArea = true;
                        foundMergedArea = area;
                        break;
                    }
                }
                
                if (isPartOfAnyMergedArea) {
                    gridState[r][c].merged = true;
                    gridState[r][c].id = foundMergedArea.id;
                    
                    if (r === foundMergedArea.startRow && c === foundMergedArea.startCol) {
                        // Top-left box represents the merged area
                        const mergedBox = gridState[r][c].element;
                        mergedBox.style.gridArea = `${foundMergedArea.startRow + 1} / ${
                            foundMergedArea.startCol + 1
                        } / ${foundMergedArea.endRow + 2} / ${
                            foundMergedArea.endCol + 2
                        }`;
                        mergedBox.style.display = "flex";
                    } else {
                        // Hide other parts
                        gridState[r][c].element.style.display = "none";
                    }
                } else {
                    gridState[r][c].merged = false;
                    gridState[r][c].id = null;
                    gridState[r][c].element.style.display = "flex";
                }
            }
        }
        
        selectedBoxes = [];
        updateSafeAreaOverlays();
    }
    
    // Reset grid
    function resetGrid() {
        widthInput.value = 1920;
        heightInput.value = 1080;
        rowsInput.value = 2;
        columnsInput.value = 3;
        
        if (gapCheckbox) gapCheckbox.checked = true; // Checked by default
        if (strokeCheckbox) strokeCheckbox.checked = false;
        if (safeAreaCheckbox) safeAreaCheckbox.checked = false;
        
        selectedBoxes = [];
        mergedAreas = [];
        updateGrid();
    }
    
    // Copy SVG
    function copySvg() {
        const gridHeight = parseInt(heightInput.value);
        const gridWidth = parseInt(widthInput.value);
        const numRows = parseInt(rowsInput.value);
        const numCols = parseInt(columnsInput.value);
        const borderRadius = calculateBorderRadius(gridHeight, gridWidth);
        const gap = calculateGap(gridHeight, gridWidth);
        const strokeColor = (strokeCheckbox && strokeCheckbox.checked) ? '#0b0f14' : 'none';
        const strokeWidth = (strokeCheckbox && strokeCheckbox.checked) ? '1' : '0';
        
        const strokePadding = (strokeCheckbox && strokeCheckbox.checked) ? 2 : 0;
        const svgWidth = gridWidth + strokePadding * 2;
        const svgHeight = gridHeight + strokePadding * 2;
        const offsetX = strokePadding;
        const offsetY = strokePadding;
        
        let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">`;
        
        const baseBoxWidth = (gridWidth - (numCols - 1) * gap) / numCols;
        const baseBoxHeight = (gridHeight - (numRows - 1) * gap) / numRows;
        
        // Track occupied cells
        let occupiedCells = Array(numRows)
            .fill(null)
            .map(() => Array(numCols).fill(false));
        
        // Draw merged boxes
        for (const area of mergedAreas) {
            const mergedBoxWidth = area.endCol - area.startCol + 1;
            const mergedBoxHeight = area.endRow - area.startRow + 1;
            
            const x = area.startCol * (baseBoxWidth + gap) + offsetX;
            const y = area.startRow * (baseBoxHeight + gap) + offsetY;
            const width = mergedBoxWidth * baseBoxWidth + (mergedBoxWidth - 1) * gap;
            const height = mergedBoxHeight * baseBoxHeight + (mergedBoxHeight - 1) * gap;
            
            svgContent += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${borderRadius}" ry="${borderRadius}" fill="#d1ff00" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
            
            for (let r = area.startRow; r <= area.endRow; r++) {
                for (let c = area.startCol; c <= area.endCol; c++) {
                    occupiedCells[r][c] = true;
                }
            }
        }
        
        // Draw individual boxes
        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < numCols; c++) {
                if (!occupiedCells[r][c]) {
                    const x = c * (baseBoxWidth + gap) + offsetX;
                    const y = r * (baseBoxHeight + gap) + offsetY;
                    svgContent += `<rect x="${x}" y="${y}" width="${baseBoxWidth}" height="${baseBoxHeight}" rx="${borderRadius}" ry="${borderRadius}" fill="#d1ff00" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
                }
            }
        }
        
        // Add safe area if enabled
        if (safeAreaCheckbox && safeAreaCheckbox.checked) {
            svgContent += `<g id="safe-area-overlay">`;
            const safeAreaInset = 15;
            
            // Safe areas for merged boxes
            for (const area of mergedAreas) {
                const mergedBoxWidth = area.endCol - area.startCol + 1;
                const mergedBoxHeight = area.endRow - area.startRow + 1;
                
                const x = area.startCol * (baseBoxWidth + gap) + offsetX;
                const y = area.startRow * (baseBoxHeight + gap) + offsetY;
                const width = mergedBoxWidth * baseBoxWidth + (mergedBoxWidth - 1) * gap;
                const height = mergedBoxHeight * baseBoxHeight + (mergedBoxHeight - 1) * gap;
                
                const safeX = x + safeAreaInset;
                const safeY = y + safeAreaInset;
                const safeWidth = Math.max(0, width - (safeAreaInset * 2));
                const safeHeight = Math.max(0, height - (safeAreaInset * 2));
                
                if (safeWidth > 0 && safeHeight > 0) {
                    svgContent += `<rect x="${safeX}" y="${safeY}" width="${safeWidth}" height="${safeHeight}" fill="none" stroke="#0b0f14" stroke-width="1"/>`;
                }
            }
            
            // Safe areas for individual boxes
            for (let r = 0; r < numRows; r++) {
                for (let c = 0; c < numCols; c++) {
                    if (!occupiedCells[r][c]) {
                        const x = c * (baseBoxWidth + gap) + offsetX;
                        const y = r * (baseBoxHeight + gap) + offsetY;
                        
                        const safeX = x + safeAreaInset;
                        const safeY = y + safeAreaInset;
                        const safeWidth = Math.max(0, baseBoxWidth - (safeAreaInset * 2));
                        const safeHeight = Math.max(0, baseBoxHeight - (safeAreaInset * 2));
                        
                        if (safeWidth > 0 && safeHeight > 0) {
                            svgContent += `<rect x="${safeX}" y="${safeY}" width="${safeWidth}" height="${safeHeight}" fill="none" stroke="#0b0f14" stroke-width="1"/>`;
                        }
                    }
                }
            }
            
            svgContent += `</g>`;
        }
        
        svgContent += `</svg>`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(svgContent).then(() => {
            const originalText = copyBtn.querySelector('.button-text').textContent;
            copyBtn.querySelector('.button-text').textContent = "Copied!";
            copyBtn.style.backgroundColor = "#28a745";
            
            setTimeout(() => {
                copyBtn.querySelector('.button-text').textContent = originalText;
                copyBtn.style.backgroundColor = "";
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy SVG: ', err);
            alert('Failed to copy SVG to clipboard');
        });
    }
    
    // Event listeners
    widthInput.addEventListener("change", updateVisualProperties);
    heightInput.addEventListener("change", updateVisualProperties);
    rowsInput.addEventListener("change", updateGrid);
    columnsInput.addEventListener("change", updateGrid);
    
    if (gapCheckbox) gapCheckbox.addEventListener("change", updateVisualProperties);
    if (strokeCheckbox) strokeCheckbox.addEventListener("change", updateVisualProperties);
    if (safeAreaCheckbox) safeAreaCheckbox.addEventListener("change", updateVisualProperties);
    
    copyBtn.addEventListener("click", copySvg);
    resetBtn.addEventListener("click", resetGrid);
    
    // Window resize listener
    window.addEventListener('resize', () => {
        updateVisualProperties();
    });
    
    // Initial grid generation
    updateGrid();
});

