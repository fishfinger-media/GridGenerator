import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { templates } from './templates';

function App() {
  const [rows, setRows] = useState(4);
  const [cols, setCols] = useState(5);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [items, setItems] = useState([]);
  const [removeGap, setRemoveGap] = useState(false);
  const [showBorder, setShowBorder] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [onlyCreatedCells, setOnlyCreatedCells] = useState(false);

  const [resizingId, setResizingId] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [svgCopied, setSvgCopied] = useState(false);
  const [mergedSvgCopied, setMergedSvgCopied] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // Dropdown states - open by default
  const [sizeOpen, setSizeOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(false);

  const gridRef = useRef(null);

  // Dev function to log current grid in template format
  const logCurrentGrid = () => {
    const templateFormat = {
      rows,
      cols,
      items: items.map(item => ({
        colStart: item.colStart,
        colEnd: item.colEnd,
        rowStart: item.rowStart,
        rowEnd: item.rowEnd
      }))
    };
    console.log('Current Grid Template Format:');
    console.log(JSON.stringify(templateFormat, null, 2));
    console.log('Copy this to add to templates.js:');
    console.log(JSON.stringify(templateFormat.items, null, 2));
  };

  // Apply template to grid
  const applyTemplate = (template) => {
    setRows(template.rows);
    setCols(template.cols);
    const newItems = template.items.map((item, index) => ({
      id: Date.now() + index,
      colStart: item.colStart,
      colEnd: item.colEnd,
      rowStart: item.rowStart,
      rowEnd: item.rowEnd
    }));
    setItems(newItems);
    setSelectionStart(null);
    setTemplateOpen(false);
  };

  // Function to calculate border radius based on shortest side of grid
  const calculateBorderRadius = (gridHeight, gridWidth) => {
    const shortestSide = Math.min(gridHeight, gridWidth);
    
    if (shortestSide < 250) return 8;
    if (shortestSide >= 250 && shortestSide < 500) return 16;
    if (shortestSide >= 500 && shortestSide < 750) return 20;
    return 20; // >= 750px
  };

  // Function to calculate gap based on shortest side of grid
  const calculateGap = (gridHeight, gridWidth) => {
    if (removeGap) return 0;
    
    const shortestSide = Math.min(gridHeight, gridWidth);
    
    if (shortestSide < 250) return 1;
    if (shortestSide >= 250 && shortestSide < 500) return 1;
    if (shortestSide >= 500 && shortestSide < 750) return 2;
    return 6; // >= 750px
  };

  // Update viewport size on window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate scale to fit viewport while maintaining aspect ratio
  const calculateScale = () => {
    // Account for padding (2rem = ~32px on each side)
    const padding = 64;
    // Account for max-width constraint (70% of viewport)
    const maxWidthConstraint = viewportSize.width * 0.7;
    
    const availableWidth = Math.min(viewportSize.width - padding, maxWidthConstraint);
    const availableHeight = viewportSize.height - padding;
    
    // Calculate scale based on aspect ratio
    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;
    
    // Use the smaller scale to maintain aspect ratio and fit within viewport
    const calculatedScale = Math.min(scaleX, scaleY, 1); 
    
    return calculatedScale;
  };

  // Calculate current scale
  const scale = calculateScale();

  // Calculate gap and border radius based on shortest side of scaled grid dimensions
  const scaledHeight = height * scale;
  const scaledWidth = width * scale;
  const gap = calculateGap(scaledHeight, scaledWidth);
  const borderRadius = calculateBorderRadius(scaledHeight, scaledWidth);

  // Helper to check overlap between two items
  const isOverlapping = (item1, item2) => {
    return !(
      item1.colEnd <= item2.colStart ||
      item1.colStart >= item2.colEnd ||
      item1.rowEnd <= item2.rowStart ||
      item1.rowStart >= item2.rowEnd
    );
  };

  // Helper to check if an item collides with any existing items
  const checkCollision = (newItem, itemsToIgnore = []) => {
    return items.some(item => {
      if (itemsToIgnore.includes(item.id)) return false;
      return isOverlapping(newItem, item);
    });
  };

  // Helper to check if a cell (r, c) is the top-left of a merged item
  const isTopLeftOfMergedItem = (r, c) => {
    return items.some(item => item.rowStart === r && item.colStart === c);
  };

  // Helper to check if a cell (r, c) is part of any merged item (but not top-left)
  const isPartOfMergedItem = (r, c) => {
    return items.some(item => {
      const isTopLeft = item.rowStart === r && item.colStart === c;
      const isInRange = r >= item.rowStart && r < item.rowEnd && 
                       c >= item.colStart && c < item.colEnd;
      return isInRange && !isTopLeft;
    });
  };

  // Helper to get the merged item that contains a cell (r, c) as top-left
  const getMergedItemAtTopLeft = (r, c) => {
    return items.find(item => item.rowStart === r && item.colStart === c);
  };

  // Handle cell click for 2-step creation
  const handleCellClick = (r, c) => {
    if (!selectionStart) {
      // Start selection
      setSelectionStart({ r, c });
    } else {
      // Complete selection
      const startRow = Math.min(selectionStart.r, r);
      const endRow = Math.max(selectionStart.r, r) + 1;
      const startCol = Math.min(selectionStart.c, c);
      const endCol = Math.max(selectionStart.c, c) + 1;

      const newItem = {
        id: Date.now(),
        colStart: startCol,
        colEnd: endCol,
        rowStart: startRow,
        rowEnd: endRow,
      };

      if (!checkCollision(newItem)) {
        setItems([...items, newItem]);
        setSelectionStart(null);
      } else {
        // Collision detected - reset selection or just do nothing
        // We'll just reset selection to let them try again
        setSelectionStart(null);
      }
    }
  };

  // Track hover for preview
  const handleCellMouseEnter = (r, c) => {
    setHoveredCell({ r, c });
  };

  // Remove item
  const handleRemoveItem = (e, id) => {
    e.stopPropagation();
    setItems(items.filter(item => item.id !== id));
  };

  // Resize logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizingId || !gridRef.current) return;

      const gridRect = gridRef.current.getBoundingClientRect();
      const relativeX = e.clientX - gridRect.left;
      const relativeY = e.clientY - gridRect.top;

      const totalWidth = gridRect.width;
      const totalHeight = gridRect.height;

      const cellWidth = (totalWidth - (cols - 1) * gap) / cols;
      const cellHeight = (totalHeight - (rows - 1) * gap) / rows;

      let newColEnd = Math.ceil(relativeX / (cellWidth + gap)) + 1;
      let newRowEnd = Math.ceil(relativeY / (cellHeight + gap)) + 1;

      // Clamp
      if (newColEnd > cols + 1) newColEnd = cols + 1;
      if (newRowEnd > rows + 1) newRowEnd = rows + 1;

      setItems(prevItems => prevItems.map(item => {
        if (item.id === resizingId) {
          const constrainedColEnd = Math.max(item.colStart + 1, newColEnd);
          const constrainedRowEnd = Math.max(item.rowStart + 1, newRowEnd);

          const newItem = { ...item, colEnd: constrainedColEnd, rowEnd: constrainedRowEnd };

          // Check collision excluding itself
          if (!checkCollision(newItem, [item.id])) {
            return newItem;
          }
          // If collision, return original (don't resize)
          return item;
        }
        return item;
      }));
    };

    const handleMouseUp = () => {
      setResizingId(null);
    };

    if (resizingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingId, cols, rows, gap, items]);

  const handleResizeStart = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingId(id);
  };

  // Generate SVG from grid
  const generateSVG = (overrideOnlyCreatedCells = null) => {
    const useOnlyCreatedCells = overrideOnlyCreatedCells !== null ? overrideOnlyCreatedCells : onlyCreatedCells;
    // Use the width and height for SVG dimensions
    const svgWidth = width;
    const svgHeight = height;
    
    // Calculate gap for SVG (based on actual grid dimensions, not scaled)
    const svgGap = calculateGap(svgHeight, svgWidth);
    
    // Calculate cell dimensions
    const totalGapWidth = (cols - 1) * svgGap;
    const totalGapHeight = (rows - 1) * svgGap;
    const cellWidth = (svgWidth - totalGapWidth) / cols;
    const cellHeight = (svgHeight - totalGapHeight) / rows;
    
    // Create a set to track which cells are filled
    const filledCells = new Set();
    items.forEach(item => {
      for (let r = item.rowStart; r < item.rowEnd; r++) {
        for (let c = item.colStart; c < item.colEnd; c++) {
          filledCells.add(`${r}-${c}`);
        }
      }
    });
    
    // Generate rectangles for all cells
    const rectangles = [];
    const safeAreaRectangles = [];
    
    // Calculate border radius for SVG (based on actual grid dimensions, not scaled)
    const svgBorderRadius = calculateBorderRadius(svgHeight, svgWidth);
    
    // First, add all empty cells as solid purple rectangles (only if onlyCreatedCells is false)
    const borderAttr = showBorder ? 'stroke="#0b0f14" stroke-width="1"' : '';
    if (!useOnlyCreatedCells) {
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          const cellKey = `${r}-${c}`;
          if (!filledCells.has(cellKey)) {
            const x = (c - 1) * (cellWidth + svgGap);
            const y = (r - 1) * (cellHeight + svgGap);
            rectangles.push(
              `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="${svgBorderRadius}" ry="${svgBorderRadius}" fill="#d1ff00" ${borderAttr}/>`
            );
          }
        }
      }
    }
    
    // Then, add filled cells (merged cells as single rectangles) - these will overlay empty cells
    items.forEach(item => {
      const x = (item.colStart - 1) * (cellWidth + svgGap);
      const y = (item.rowStart - 1) * (cellHeight + svgGap);
      const rectWidth = (item.colEnd - item.colStart) * cellWidth + (item.colEnd - item.colStart - 1) * svgGap;
      const rectHeight = (item.rowEnd - item.rowStart) * cellHeight + (item.rowEnd - item.rowStart - 1) * svgGap;
      
      rectangles.push(
        `<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="${svgBorderRadius}" ry="${svgBorderRadius}" fill="#d1ff00" ${borderAttr}/>`
      );
    });
    
    // Add safe area rectangles if enabled
    if (showSafeArea) {
      const safeAreaInset = 15;
      
      // For merged items, draw safe area only at top-left
      items.forEach(item => {
        const x = (item.colStart - 1) * (cellWidth + svgGap);
        const y = (item.rowStart - 1) * (cellHeight + svgGap);
        const rectWidth = (item.colEnd - item.colStart) * cellWidth + (item.colEnd - item.colStart - 1) * svgGap;
        const rectHeight = (item.rowEnd - item.rowStart) * cellHeight + (item.rowEnd - item.rowStart - 1) * svgGap;
        
        const safeAreaX = x + safeAreaInset;
        const safeAreaY = y + safeAreaInset;
        const safeAreaWidth = Math.max(0, rectWidth - safeAreaInset * 2);
        const safeAreaHeight = Math.max(0, rectHeight - safeAreaInset * 2);
        
        if (safeAreaWidth > 0 && safeAreaHeight > 0) {
          safeAreaRectangles.push(
            `<rect x="${safeAreaX}" y="${safeAreaY}" width="${safeAreaWidth}" height="${safeAreaHeight}" fill="none" stroke="#ff0000" stroke-width="1"/>`
          );
        }
      });
      
      // For empty cells, draw safe area for each (only if onlyCreatedCells is false)
      if (!useOnlyCreatedCells) {
        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= cols; c++) {
            const cellKey = `${r}-${c}`;
            if (!filledCells.has(cellKey)) {
              const x = (c - 1) * (cellWidth + svgGap);
              const y = (r - 1) * (cellHeight + svgGap);
              
              const safeAreaX = x + safeAreaInset;
              const safeAreaY = y + safeAreaInset;
              const safeAreaWidth = Math.max(0, cellWidth - safeAreaInset * 2);
              const safeAreaHeight = Math.max(0, cellHeight - safeAreaInset * 2);
              
              if (safeAreaWidth > 0 && safeAreaHeight > 0) {
                safeAreaRectangles.push(
                  `<rect x="${safeAreaX}" y="${safeAreaY}" width="${safeAreaWidth}" height="${safeAreaHeight}" fill="none" stroke="#ff0000" stroke-width="1"/>`
                );
              }
            }
          }
        }
      }
    }
    
    // Build SVG with safe area group if enabled
    let svgContent = rectangles.join('\n');
    if (showSafeArea && safeAreaRectangles.length > 0) {
      svgContent += `\n<g id="safe-area-overlay">\n${safeAreaRectangles.join('\n')}\n</g>`;
    }
    
    const svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
${svgContent}
</svg>`;
    
    return svg;
  };

  // Copy SVG to clipboard
  const handleCopySVG = async () => {
    try {
      const svg = generateSVG();
      await navigator.clipboard.writeText(svg);
      setSvgCopied(true);
      setTimeout(() => setSvgCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy SVG:', err);
    }
  };

  // Copy merged grid SVG to clipboard (only created cells)
  const handleCopyMergedSVG = async () => {
    try {
      const svg = generateSVG(true);
      await navigator.clipboard.writeText(svg);
      setMergedSvgCopied(true);
      setTimeout(() => setMergedSvgCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy merged SVG:', err);
    }
  };

  // Generate grid placeholders
  const placeholders = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const isSelectedStart = selectionStart && selectionStart.r === r && selectionStart.c === c;

      placeholders.push(
        <div
          key={`${r}-${c}`}
          className={`grid-cell-placeholder ${isSelectedStart ? 'active-start' : ''}`}
          style={{ 
            gridArea: `${r} / ${c} / ${r + 1} / ${c + 1}`,
            borderRadius: `${borderRadius}px`
          }}
          onClick={() => handleCellClick(r, c)}
          onMouseEnter={() => handleCellMouseEnter(r, c)}
        />
      );
    }
  }

  // Generate safe area overlays for preview
  const generateSafeAreaOverlays = () => {
    if (!showSafeArea) return [];
    
    const safeAreaInset = 15;
    const overlays = [];
    
    // Create a set to track which cells are filled
    const filledCells = new Set();
    items.forEach(item => {
      for (let r = item.rowStart; r < item.rowEnd; r++) {
        for (let c = item.colStart; c < item.colEnd; c++) {
          filledCells.add(`${r}-${c}`);
        }
      }
    });
    
    // For merged items, draw safe area only at top-left using grid positioning
    items.forEach(item => {
      overlays.push(
        <div
          key={`safe-area-item-${item.id}`}
          className="safe-area-overlay"
          style={{
            gridColumnStart: item.colStart,
            gridColumnEnd: item.colEnd,
            gridRowStart: item.rowStart,
            gridRowEnd: item.rowEnd,
            position: 'relative',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: `${safeAreaInset}px`,
              border: '1px solid #ff0000',
            }}
          />
        </div>
      );
    });
    
    // For empty cells, draw safe area for each using grid positioning
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const cellKey = `${r}-${c}`;
        if (!filledCells.has(cellKey)) {
          overlays.push(
            <div
              key={`safe-area-empty-${r}-${c}`}
              className="safe-area-overlay"
              style={{
                gridArea: `${r} / ${c} / ${r + 1} / ${c + 1}`,
                position: 'relative',
                pointerEvents: 'none',
                zIndex: 15,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: `${safeAreaInset}px`,
                  border: '1px solid #ff0000',
                }}
              />
            </div>
          );
        }
      }
    }
    
    return overlays;
  };

  // Calculate preview item style
  let previewItem = null;
  if (selectionStart && hoveredCell) {
    const startRow = Math.min(selectionStart.r, hoveredCell.r);
    const endRow = Math.max(selectionStart.r, hoveredCell.r) + 1;
    const startCol = Math.min(selectionStart.c, hoveredCell.c);
    const endCol = Math.max(selectionStart.c, hoveredCell.c) + 1;

    const previewItemObj = {
      colStart: startCol,
      colEnd: endCol,
      rowStart: startRow,
      rowEnd: endRow
    };

    const isInvalid = checkCollision(previewItemObj);

    previewItem = (
      <motion.div
        layoutId="preview-box"
        className={`grid-item preview ${isInvalid ? 'invalid' : ''}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          borderColor: isInvalid ? '#ff4444' : 'var(--accent-color)',
          backgroundColor: isInvalid ? 'rgba(255, 68, 68, 0.2)' : 'rgba(209, 255, 0, 0.1)'
        }}
        exit={{ opacity: 0 }}
        style={{
          gridColumnStart: startCol,
          gridColumnEnd: endCol,
          gridRowStart: startRow,
          gridRowEnd: endRow,
          zIndex: 5,
          pointerEvents: 'none',
          borderStyle: 'dashed',
          borderWidth: '1px',
          borderRadius: `${borderRadius}px`,
        }}
      />
    );
  }

  // Handle number input with step
  const handleNumberChange = (value, setter, step = 1) => {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setter(numValue);
    }
  };

  const handleNumberStep = (setter, currentValue, step) => {
    setter(Math.max(1, currentValue + step));
  };

  return (
    <div className="app-container">
      <div className="navigation float">
        <div className="navigation-w">
          <div className="v-flex gap-2">
            <div className="h-flex flex-center gap-2">
              <div className="logo-w">
                <svg className="logo-w" height="100%" width="auto" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M42.3675 8.67708C40.8552 7.81646 39.0858 7.38492 37.0598 7.38492C35.0336 7.38492 33.2987 7.81646 31.7741 8.67708C30.2472 9.53774 29.0653 10.7348 28.2284 12.2684C27.3915 13.8019 26.9731 15.6061 26.9731 17.676C26.9731 19.7459 27.3915 21.5111 28.2284 23.0446C29.0653 24.5782 30.2472 25.768 31.7741 26.6164C33.2987 27.4648 35.0629 27.8866 37.0598 27.8866C39.0564 27.8866 40.8552 27.4624 42.3675 26.6164C43.8797 25.768 45.0616 24.5782 45.9131 23.0446C46.7646 21.5111 47.1879 19.7215 47.1879 17.676C47.1879 15.6305 46.7623 13.8019 45.9131 12.2684C45.0616 10.7348 43.8797 9.53774 42.3675 8.67708ZM41.4153 22.2596C40.3215 23.4298 38.8706 24.015 37.0598 24.015C35.2488 24.015 33.8394 23.4298 32.7456 22.2596C31.6518 21.0893 31.1061 19.5484 31.1061 17.637C31.1061 15.7255 31.6518 14.1871 32.7456 13.0144C33.8394 11.8441 35.2781 11.259 37.0598 11.259C38.8412 11.259 40.3215 11.8514 41.4153 13.0339C42.5091 14.2188 43.055 15.7645 43.055 17.676C43.055 19.5874 42.5068 21.0869 41.4153 22.2571V22.2596Z" fill="#EEF6F8"/>
                  <path d="M53.0998 0H49.1309V23.3299C49.1309 24.271 49.2851 25.0658 49.5958 25.7119C49.9065 26.358 50.3325 26.848 50.8706 27.1845C51.4114 27.5209 52.0306 27.6892 52.7352 27.6892C53.1953 27.6892 53.6261 27.655 54.0323 27.5892C54.4385 27.5209 54.8154 27.4209 55.1677 27.2869V24.0589C54.627 24.0589 54.1472 23.9102 53.729 23.6151C53.3105 23.3201 53.0998 22.7545 53.0998 21.9207V0Z" fill="#EEF6F8"/>
                  <path d="M61.0406 0H57.0714V23.3299C57.0714 24.271 57.2256 25.0658 57.5363 25.7119C57.8473 26.358 58.2729 26.848 58.8114 27.1845C59.3522 27.5209 59.9714 27.6892 60.676 27.6892C61.1361 27.6892 61.5666 27.655 61.9728 27.5892C62.379 27.5209 62.7558 27.4209 63.1082 27.2869V24.0589C62.5674 24.0589 62.088 23.9102 61.6695 23.6151C61.251 23.3201 61.0406 22.7545 61.0406 21.9207V0Z" fill="#EEF6F8"/>
                  <path d="M69.7397 23.7736L79.8387 10.9396V7.78962H64.9705V11.5028H74.7905L64.7282 24.3392V27.4868H80V23.7736H69.7397Z" fill="#EEF6F8"/>
                  <path d="M18.3914 0.0414559C14.3954 0.285262 8.58129 3.58639 4.19377 9.78152C4.10568 9.90587 4.26472 10.0522 4.3822 9.95463C8.93853 6.08298 12.5528 4.99318 15.0121 4.75667C17.6206 4.50311 18.9885 6.3146 19.0717 8.18459C19.1573 10.0521 18.6777 11.3931 17.4786 13.3265C15.9982 15.7134 14.1067 17.2664 12.8831 18.4245C11.6694 19.5753 11.415 19.9702 10.9794 20.609C10.3798 21.4891 10.8056 21.9816 10.972 22.123C11.1384 22.2644 11.7551 22.4717 12.9541 21.9938C14.1532 21.516 17.6181 19.0828 19.4216 16.9178C20.7063 15.3769 21.6998 14.1798 22.4853 12.7999C26.9339 4.9834 23.8532 -0.29256 18.3914 0.0414559Z" fill="#EEF6F8"/>
                  <path d="M20.2316 22.0743C15.6752 25.9459 12.061 27.0358 9.60168 27.2722C6.99316 27.5258 5.62525 25.7143 5.54204 23.8443C5.4564 21.9768 5.93603 20.6358 7.13507 18.7024C8.61552 16.3155 10.5071 14.7625 11.7306 13.6044C12.9443 12.4536 13.1988 12.0587 13.6344 11.4199C14.2339 10.5398 13.8081 10.0473 13.6417 9.90587C13.4753 9.76446 12.8587 9.55721 11.6597 10.0351C10.4606 10.5129 6.99558 12.9461 5.19212 15.1111C3.90745 16.652 2.91394 17.8491 2.12846 19.2291C-2.31778 27.0431 0.760572 32.319 6.22232 31.985C10.2183 31.7412 16.0325 28.4401 20.42 22.2449C20.5081 22.1206 20.349 21.9743 20.2316 22.0718V22.0743Z" fill="#EEF6F8"/>
                </svg>
              </div>
              <h1>Grid Generator</h1>
            </div>
            <div className="menu-dropdown_w" id="template">
              <div className={`menu-dropdown ${templateOpen ? 'expanded' : ''}`}>
                <div className="h-flex flex-stretch gap-1" onClick={() => setTemplateOpen(!templateOpen)}>
                  <h3>Templates</h3>
                  <svg 
                    width="12" 
                    height="7" 
                    viewBox="0 0 12 7" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: templateOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path fillRule="evenodd" clipRule="evenodd" d="M5.781 6.8415L11.562 1.062L10.5015 0L5.781 4.7205L1.062 0L0 1.062L5.781 6.8415Z" fill="#0B0F14"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="menu-dropdown_w" id="list">
            <div className={`menu-dropdown ${sizeOpen ? 'expanded' : ''}`}>
              <div className="h-flex flex-stretch gap-1" onClick={() => setSizeOpen(!sizeOpen)}>
                <h3>Size</h3>
                <svg 
                  width="12" 
                  height="7" 
                  viewBox="0 0 12 7" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ transform: sizeOpen ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: '-0.25em' }}
                >
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.781 6.8415L11.562 1.062L10.5015 0L5.781 4.7205L1.062 0L0 1.062L5.781 6.8415Z" fill="#0B0F14"/>
                </svg>
              </div>
              <div className="dropdown-menu_w" style={{ maxHeight: sizeOpen ? '1000px' : '0' }}>
                <div className="dropdown-menu_c">
                  <div className="v-flex gap-05">
                    <div className="h-flex flex-stretch gap-1">
                      <label htmlFor="size-width">Width</label>
                      <div className="input-number_w">
                        <button 
                          type="button" 
                          className="input-btn input-btn-minus" 
                          onClick={() => handleNumberStep(setWidth, width, -10)}
                        >
                          <svg width="8" height="1" viewBox="0 0 8 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 1H0V0H8V1Z" fill="#CDE0E6"/>
                          </svg>
                        </button>
                        <input 
                          type="number" 
                          id="size-width" 
                          name="size-width" 
                          value={width} 
                          step="10"
                          onChange={(e) => handleNumberChange(e.target.value, setWidth, 10)}
                        />
                        <button 
                          type="button" 
                          className="input-btn input-btn-plus" 
                          onClick={() => handleNumberStep(setWidth, width, 10)}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 4.57143H4.57143V8H3.42857V4.57143H0V3.42857H3.42857V0H4.57143V3.42857H8V4.57143Z" fill="#CDE0E6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="h-flex flex-stretch gap-1">
                      <label htmlFor="size-height">Height</label>
                      <div className="input-number_w">
                        <button 
                          type="button" 
                          className="input-btn input-btn-minus" 
                          onClick={() => handleNumberStep(setHeight, height, -10)}
                        >
                          <svg width="8" height="1" viewBox="0 0 8 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 1H0V0H8V1Z" fill="#CDE0E6"/>
                          </svg>
                        </button>
                        <input 
                          type="number" 
                          id="size-height" 
                          name="size-height" 
                          value={height} 
                          step="10"
                          onChange={(e) => handleNumberChange(e.target.value, setHeight, 10)}
                        />
                        <button 
                          type="button" 
                          className="input-btn input-btn-plus" 
                          onClick={() => handleNumberStep(setHeight, height, 10)}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 4.57143H4.57143V8H3.42857V4.57143H0V3.42857H3.42857V0H4.57143V3.42857H8V4.57143Z" fill="#CDE0E6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`menu-dropdown ${layoutOpen ? 'expanded' : ''}`}>
              <div className="h-flex flex-stretch gap-1" onClick={() => setLayoutOpen(!layoutOpen)}>
                <h3>Layout</h3>
                <svg 
                  width="12" 
                  height="7" 
                  viewBox="0 0 12 7" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ transform: layoutOpen ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: '-0.25em' }}
                >
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.781 6.8415L11.562 1.062L10.5015 0L5.781 4.7205L1.062 0L0 1.062L5.781 6.8415Z" fill="#0B0F14"/>
                </svg>
              </div>
              <div className="dropdown-menu_w" style={{ maxHeight: layoutOpen ? '1000px' : '0' }}>
                <div className="dropdown-menu_c">
                  <div className="v-flex gap-05">
                    <div className="h-flex flex-stretch gap-1">
                      <label htmlFor="layout-rows">Rows</label>
                      <div className="input-number_w">
                        <button 
                          type="button" 
                          className="input-btn input-btn-minus" 
                          onClick={() => handleNumberStep(setRows, rows, -1)}
                        >
                          <svg width="8" height="1" viewBox="0 0 8 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 1H0V0H8V1Z" fill="#CDE0E6"/>
                          </svg>
                        </button>
                        <input 
                          type="number" 
                          id="layout-rows" 
                          name="layout-rows" 
                          value={rows} 
                          step="1" 
                          min="1"
                          onChange={(e) => handleNumberChange(e.target.value, setRows, 1)}
                        />
                        <button 
                          type="button" 
                          className="input-btn input-btn-plus" 
                          onClick={() => handleNumberStep(setRows, rows, 1)}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 4.57143H4.57143V8H3.42857V4.57143H0V3.42857H3.42857V0H4.57143V3.42857H8V4.57143Z" fill="#CDE0E6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="h-flex flex-stretch gap-1">
                      <label htmlFor="layout-columns">Columns</label>
                      <div className="input-number_w">
                        <button 
                          type="button" 
                          className="input-btn input-btn-minus" 
                          onClick={() => handleNumberStep(setCols, cols, -1)}
                        >
                          <svg width="8" height="1" viewBox="0 0 8 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 1H0V0H8V1Z" fill="#CDE0E6"/>
                          </svg>
                        </button>
                        <input 
                          type="number" 
                          id="layout-columns" 
                          name="layout-columns" 
                          value={cols} 
                          step="1" 
                          min="1"
                          onChange={(e) => handleNumberChange(e.target.value, setCols, 1)}
                        />
                        <button 
                          type="button" 
                          className="input-btn input-btn-plus" 
                          onClick={() => handleNumberStep(setCols, cols, 1)}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 4.57143H4.57143V8H3.42857V4.57143H0V3.42857H3.42857V0H4.57143V3.42857H8V4.57143Z" fill="#CDE0E6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`menu-dropdown ${settingsOpen ? 'expanded' : ''}`}>
              <div className="h-flex flex-stretch gap-1" onClick={() => setSettingsOpen(!settingsOpen)}>
                <h3>Settings</h3>
                <svg 
                  width="12" 
                  height="7" 
                  viewBox="0 0 12 7" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)', marginTop: '-0.25em' }}
                >
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.781 6.8415L11.562 1.062L10.5015 0L5.781 4.7205L1.062 0L0 1.062L5.781 6.8415Z" fill="#0B0F14"/>
                </svg>
              </div>
              <div className="dropdown-menu_w" style={{ maxHeight: settingsOpen ? '1000px' : '0' }}>
                <div className="dropdown-menu_c">
                  <div className="v-flex gap-05">
                    <label>
                      <input 
                        type="checkbox" 
                        name="option-gap"
                        checked={!removeGap}
                        onChange={(e) => setRemoveGap(!e.target.checked)}
                      />
                      Gap
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        name="option-stroke"
                        checked={showBorder}
                        onChange={(e) => setShowBorder(e.target.checked)}
                      />
                      Stroke
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        name="option-safe-area"
                        checked={showSafeArea}
                        onChange={(e) => setShowSafeArea(e.target.checked)}
                      />
                      Safe Area
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="grid-workspace">
        <div
          className="grid-container"
          ref={gridRef}
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            columnGap: `${gap}px`,
            rowGap: `${gap}px`,
            width: `${width * scale}px`,
            height: `${height * scale}px`,
            maxWidth: '70%',
            maxHeight: '100%',
            position: 'relative',
          }}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {placeholders}

          <AnimatePresence>
            {previewItem}
            {items.map((item) => (
              <motion.div
                layout
                key={item.id}
                className="grid-item"
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 700, damping: 35 }}
                style={{
                  gridColumnStart: item.colStart,
                  gridColumnEnd: item.colEnd,
                  gridRowStart: item.rowStart,
                  gridRowEnd: item.rowEnd,
                  zIndex: resizingId === item.id ? 20 : 10,
                  borderRadius: `${borderRadius}px`,
                  border: showBorder ? '1px solid #0b0f14' : 'none',
                  
                }}
              >
                <div
                  className="remove-btn"
                  onClick={(e) => handleRemoveItem(e, item.id)}
                >
                  ✕
                </div>
                <div
                  className="resize-handle"
                  onMouseDown={(e) => handleResizeStart(e, item.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {showSafeArea && generateSafeAreaOverlays()}
        </div>

        <div className="menu-button_w float">
          <button className="button" id="btn-reset" onClick={() => {
            setItems([]);
            setSelectionStart(null);
          }}>
            <span className="button-text">Reset Grid</span>
          </button>

          <button className="button is-primary" id="btn-copy" onClick={handleCopySVG}>
            <span className="button-text">{svgCopied ? 'Copied!' : 'Copy Full Grid'}</span>
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.35984 0C0.602714 0 4.92761e-05 0.633828 0 1.39028V9.56792H1.6208V1.6495H8.21305V0H1.35984Z" fill="black"/>
<path d="M12 4.69131C11.9999 3.93486 11.3973 3.30103 10.6402 3.30103H4.59735C3.84023 3.30103 3.23756 3.93486 3.23751 4.69131V12.6097C3.23766 13.3661 3.8403 14 4.59735 14H10.6402C11.3972 14 11.9999 13.3661 12 12.6097V4.69131ZM10.3792 12.3505H4.85831V4.95053H10.3792V12.3505Z" fill="black"/>
</svg>

          </button>

          <button className="button is-primary" id="btn-copy-merged" onClick={handleCopyMergedSVG}>
            <span className="button-text">{mergedSvgCopied ? 'Copied!' : 'Copy Grid'}</span>
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.35984 0C0.602714 0 4.92761e-05 0.633828 0 1.39028V9.56792H1.6208V1.6495H8.21305V0H1.35984Z" fill="black"/>
<path d="M12 4.69131C11.9999 3.93486 11.3973 3.30103 10.6402 3.30103H4.59735C3.84023 3.30103 3.23756 3.93486 3.23751 4.69131V12.6097C3.23766 13.3661 3.8403 14 4.59735 14H10.6402C11.3972 14 11.9999 13.3661 12 12.6097V4.69131ZM10.3792 12.3505H4.85831V4.95053H10.3792V12.3505Z" fill="black"/>
</svg>

          </button>

          <button 
            className="button dev-button" 
            id="btn-dev" 
            onClick={logCurrentGrid}
            title="Log current grid template format to console"
          >
            <span className="button-text">Dev: Log Grid</span>
          </button>
        </div>
      </main>

      {/* Templates Overlay */}
      <AnimatePresence>
        {templateOpen && (
          <motion.div
            className="templates-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setTemplateOpen(false);
              }
            }}
          >
            <motion.div
              className="templates-container"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="templates-header">
                <h2>Templates</h2>
                <button
                  className="templates-close"
                  onClick={() => setTemplateOpen(false)}
                  aria-label="Close templates"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="templates-grid">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="template-item"
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="template-preview">
                      <img 
                        src={template.imageSrc} 
                        alt={template.name || `Template ${template.id}`}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
