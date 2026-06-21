export interface DragListOptions {
  itemSelector: string; // '.draggable-row' or '.draggable-card'
  handleSelector: string; // '.drag-handle'
  onReorder: (newIndices: number[]) => void;
  isGrid?: boolean;
}

export class DragList {
  private container: HTMLElement;
  private options: DragListOptions;
  private items: HTMLElement[] = [];
  private draggedIndex: number | null = null;
  private draggedItem: HTMLElement | null = null;
  private clone: HTMLElement | null = null;
  private placeholderHTML: string = '';
  private isDragging = false;
  private activeTouchId: number | null = null;

  // Touch state
  private touchStartPos = { x: 0, y: 0 };
  private touchTimer: any = null;
  private isLongPress = false;

  // Drag coordinates & offset on original element
  private dragOffset = { x: 0, y: 0 };

  // Visual insertion elements
  private insertionLine: HTMLElement | null = null;
  private targetIndex: number | null = null;
  private insertPosition: 'above' | 'below' | null = null;

  // Keyboard accessibility
  private pickedUpIndex: number | null = null;
  private ghostImage: HTMLElement | null = null;

  // Scroll details
  private scrollInterval: any = null;
  private animationFrameId: number | null = null;
  private scrollSpeed = 8;

  constructor(container: HTMLElement, options: DragListOptions) {
    this.container = container;
    this.options = {
      isGrid: false,
      ...options
    };
    this.init();
  }

  public init() {
    this.refresh();
    this.setupContainerListeners();
  }

  public refresh() {
    // Re-scan items
    const rawItems = Array.from(this.container.querySelectorAll(this.options.itemSelector));
    this.items = rawItems as HTMLElement[];

    // Ensure they possess indexes
    this.items.forEach((item, idx) => {
      item.setAttribute('data-drag-index', idx.toString());
      
      // Bind keyboard events on handles
      const handle = item.querySelector(this.options.handleSelector) as HTMLElement;
      if (handle) {
        handle.setAttribute('role', 'button');
        handle.setAttribute('tabindex', '0');
        // Retrieve filename or part label for screen reader
        const labelEl = item.querySelector('.truncate, p, span');
        const filename = labelEl ? labelEl.textContent || 'item' : 'item';
        handle.setAttribute('aria-label', `Drag to reorder ${filename}`);
        
        // Cleanup old keyboard handlers if any
        handle.onkeydown = null;
        handle.onkeydown = (e: KeyboardEvent) => this.handleKeyboard(e, idx);
      }
    });
  }

  private setupContainerListeners() {
    // Enable HTML5 drag on handles mousedown
    this.container.addEventListener('mousedown', this.handleMousedown, { passive: false });
    
    // Touch Events
    this.container.addEventListener('touchstart', this.handleTouchstart, { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchmove, { passive: false });
    this.container.addEventListener('touchend', this.handleTouchend, { passive: false });
    this.container.addEventListener('touchcancel', this.handleTouchend, { passive: false });

    // HTML5 Drag Event binds
    this.container.addEventListener('dragstart', this.handleDragStart);
    this.container.addEventListener('dragover', this.handleDragOver);
    this.container.addEventListener('dragend', this.handleDragEnd);
    this.container.addEventListener('drop', this.handleDrop);
  }

  public destroy() {
    if (this.scrollInterval) clearInterval(this.scrollInterval);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    
    this.container.removeEventListener('mousedown', this.handleMousedown);
    this.container.removeEventListener('touchstart', this.handleTouchstart);
    this.container.removeEventListener('touchmove', this.handleTouchmove);
    this.container.removeEventListener('touchend', this.handleTouchend);
    this.container.removeEventListener('touchcancel', this.handleTouchend);
    this.container.removeEventListener('dragstart', this.handleDragStart);
    this.container.removeEventListener('dragover', this.handleDragOver);
    this.container.removeEventListener('dragend', this.handleDragEnd);
    this.container.removeEventListener('drop', this.handleDrop);

    this.cleanupCloneAndLine();
    if (this.ghostImage && this.ghostImage.parentNode) {
      this.ghostImage.parentNode.removeChild(this.ghostImage);
    }
  }

  // --- Mouse / HTML5 events ---

  private handleMousedown = (e: MouseEvent) => {
    const handle = (e.target as HTMLElement).closest(this.options.handleSelector);
    if (!handle) return;
    
    // Enable draggable for items on handle mousedown
    const item = handle.closest(this.options.itemSelector) as HTMLElement;
    if (item) {
      item.setAttribute('draggable', 'true');
    }
  };

  private handleDragStart = (e: DragEvent) => {
    const target = e.target as HTMLElement;
    const item = target.closest(this.options.itemSelector) as HTMLElement;
    if (!item) {
      e.preventDefault();
      return;
    }

    const index = parseInt(item.getAttribute('data-drag-index') || '-1', 10);
    if (index === -1) {
      e.preventDefault();
      return;
    }

    this.draggedIndex = index;
    this.draggedItem = item;
    this.isDragging = true;

    // 1. Create invisible ghost to hide native system preview
    this.ghostImage = document.createElement('div');
    this.ghostImage.id = 'drag-ghost-pixel';
    this.ghostImage.style.position = 'absolute';
    this.ghostImage.style.top = '-9999px';
    this.ghostImage.style.width = '1px';
    this.ghostImage.style.height = '1px';
    this.ghostImage.style.opacity = '0';
    document.body.appendChild(this.ghostImage);
    e.dataTransfer?.setDragImage(this.ghostImage, 0, 0);

    // 2. Setup manual visual clone
    const rect = item.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    this.clone = item.cloneNode(true) as HTMLElement;
    this.clone.classList.add('drag-clone');
    this.clone.style.width = rect.width + 'px';
    this.clone.style.height = rect.height + 'px';
    this.clone.style.top = rect.top + 'px';
    this.clone.style.left = rect.left + 'px';
    document.body.appendChild(this.clone);

    // 3. Mark original as placeholder
    this.placeholderHTML = item.innerHTML;
    item.classList.add('drag-placeholder');
    // Save height to preserve layout
    item.style.height = rect.height + 'px';
    item.innerHTML = '<span class="text-text-sub font-semibold text-[11px] font-mono animate-pulse">Drop here</span>';

    // 4. Create insertion line
    this.createInsertionLine();
  };

  private handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!this.isDragging || !this.clone || !this.draggedItem) return;

    // Update clone position
    this.clone.style.top = (e.clientY - this.dragOffset.y) + 'px';
    this.clone.style.left = (e.clientX - this.dragOffset.x) + 'px';

    this.calculateDropTargets(e.clientX, e.clientY);
    this.handleAutoScroll(e.clientY, false);
  };

  private handleDragEnd = (e: DragEvent) => {
    this.stopAutoScroll();
    if (this.draggedItem) {
      this.draggedItem.removeAttribute('draggable');
    }
    this.finalizeDrop();
  };

  private handleDrop = (e: DragEvent) => {
    e.preventDefault();
  };

  // --- Touch Handling ---

  private handleTouchstart = (e: TouchEvent) => {
    const handle = (e.target as HTMLElement).closest(this.options.handleSelector);
    if (!handle) return;

    const item = handle.closest(this.options.itemSelector) as HTMLElement;
    if (!item) return;

    const index = parseInt(item.getAttribute('data-drag-index') || '-1', 10);
    if (index === -1) return;

    e.preventDefault(); // Stop click behavior logic

    const touch = e.touches[0];
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    this.activeTouchId = touch.identifier;
    this.isLongPress = false;

    // 150ms long press to activate dragging
    if (this.touchTimer) clearTimeout(this.touchTimer);
    this.touchTimer = setTimeout(() => {
      this.isLongPress = true;
      
      // Haptic haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      this.draggedIndex = index;
      this.draggedItem = item;
      this.isDragging = true;

      const rect = item.getBoundingClientRect();
      this.dragOffset = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };

      this.clone = item.cloneNode(true) as HTMLElement;
      this.clone.classList.add('drag-clone', 'drag-clone-touch');
      this.clone.style.width = rect.width + 'px';
      this.clone.style.height = rect.height + 'px';
      this.clone.style.top = rect.top + 'px';
      this.clone.style.left = rect.left + 'px';
      document.body.appendChild(this.clone);

      this.placeholderHTML = item.innerHTML;
      item.classList.add('drag-placeholder');
      item.style.height = rect.height + 'px';
      item.innerHTML = '<span class="text-text-sub font-semibold text-[11px] font-mono animate-pulse">Drop here</span>';

      this.createInsertionLine(true);
    }, 150);
  };

  private handleTouchmove = (e: TouchEvent) => {
    if (this.activeTouchId === null) return;
    const touch = Array.from(e.touches).find(t => t.identifier === this.activeTouchId);
    if (!touch) return;

    // Cancel drag trigger if they moves finger before 150ms timeout completes
    if (!this.isLongPress) {
      const dist = Math.hypot(touch.clientX - this.touchStartPos.x, touch.clientY - this.touchStartPos.y);
      if (dist > 8) {
        clearTimeout(this.touchTimer);
        this.activeTouchId = null;
      }
      return;
    }

    e.preventDefault(); // Stop active window scroll

    if (this.isDragging && this.clone) {
      this.clone.style.top = (touch.clientY - this.dragOffset.y) + 'px';
      this.clone.style.left = (touch.clientX - this.dragOffset.x) + 'px';

      this.calculateDropTargets(touch.clientX, touch.clientY);
      this.handleAutoScroll(touch.clientY, true);
    }
  };

  private handleTouchend = (e: TouchEvent) => {
    clearTimeout(this.touchTimer);
    this.stopAutoScroll();
    this.activeTouchId = null;
    
    if (this.isDragging) {
      this.finalizeDrop();
    }
  };

  // --- Keyboard Handling (Accessibility) ---

  private handleKeyboard = (e: KeyboardEvent, idx: number) => {
    const item = this.items[idx];
    const rawFilename = item.querySelector('.truncate, p, span')?.textContent || 'item';
    const total = this.items.length;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (this.pickedUpIndex === null) {
        // Pick up the item
        this.pickedUpIndex = idx;
        item.classList.add('drag-clone');
        this.announceLive(`${rawFilename} picked up. Current position: ${idx + 1} of ${total}. Use Arrow Up or Arrow Down to move, Space or Enter to drop.`);
      } else if (this.pickedUpIndex === idx) {
        // Drop the item
        item.classList.remove('drag-clone');
        this.pickedUpIndex = null;
        this.announceLive(`${rawFilename} dropped at position ${idx + 1} of ${total}.`);
      }
    } else if (e.key === 'ArrowUp') {
      if (this.pickedUpIndex !== null) {
        e.preventDefault();
        const nextIdx = Math.max(0, idx - 1);
        if (nextIdx !== idx) {
          this.swapDOMItems(idx, nextIdx);
          this.announceLive(`Moved to position ${nextIdx + 1} of ${total}.`);
          // Maintain focus on the moved drag handle
          setTimeout(() => {
            const newHandle = this.items[nextIdx]?.querySelector(this.options.handleSelector) as HTMLElement;
            newHandle?.focus();
          }, 30);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (this.pickedUpIndex !== null) {
        e.preventDefault();
        const nextIdx = Math.min(total - 1, idx + 1);
        if (nextIdx !== idx) {
          this.swapDOMItems(idx, nextIdx);
          this.announceLive(`Moved to position ${nextIdx + 1} of ${total}.`);
          setTimeout(() => {
            const newHandle = this.items[nextIdx]?.querySelector(this.options.handleSelector) as HTMLElement;
            newHandle?.focus();
          }, 30);
        }
      }
    } else if (e.key === 'Escape') {
      if (this.pickedUpIndex !== null) {
        e.preventDefault();
        item.classList.remove('drag-clone');
        this.pickedUpIndex = null;
        this.announceLive('Reorder cancelled.');
        this.refresh();
      }
    }
  };

  private swapDOMItems(idx1: number, idx2: number) {
    const listIndices = Array.from({ length: this.items.length }, (_, i) => i);
    // Swap
    listIndices[idx1] = idx2;
    listIndices[idx2] = idx1;
    this.options.onReorder(listIndices);
  }

  // --- Auto Scrolling Logic ---

  private handleAutoScroll(clientY: number, isTouch: boolean) {
    const threshold = isTouch ? 80 : 60;
    const viewHeight = window.innerHeight;
    
    // Stop previous auto scroll intervals
    this.stopAutoScroll();

    let speed = 0;
    if (clientY < threshold) {
      // Near top of screen
      speed = -this.scrollSpeed * (1 - clientY / threshold);
    } else if (clientY > viewHeight - threshold) {
      // Near bottom
      const distance = viewHeight - clientY;
      speed = this.scrollSpeed * (1 - distance / threshold);
    }

    if (speed !== 0) {
      const parentContainer = this.findScrollableParent(this.container);
      this.scrollInterval = setInterval(() => {
        parentContainer.scrollTop += speed;
      }, 16);
    }
  }

  private stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  private findScrollableParent(el: HTMLElement): HTMLElement {
    let parent = el.parentElement;
    while (parent) {
      const overflow = window.getComputedStyle(parent).overflowY;
      if (parent === document.body || overflow === 'auto' || overflow === 'scroll') {
        return parent;
      }
      parent = parent.parentElement;
    }
    return document.body;
  }

  // --- Dynamic Drop Core Calculations ---

  private createInsertionLine(isTouch = false) {
    if (this.insertionLine) return;
    this.insertionLine = document.createElement('div');
    this.insertionLine.className = `drag-insert-line ${isTouch ? 'drag-insert-line-touch' : ''}`;
    this.container.appendChild(this.insertionLine);
  }

  private calculateDropTargets(clientX: number, clientY: number) {
    // Hide clone temporarily to accurately see underlying element
    if (this.clone) this.clone.style.pointerEvents = 'none';

    const hoveredEl = document.elementFromPoint(clientX, clientY);
    const item = hoveredEl?.closest(this.options.itemSelector) as HTMLElement;

    if (!item || !this.container.contains(item)) {
      this.clearRowShifts();
      if (this.insertionLine) this.insertionLine.style.opacity = '0';
      this.targetIndex = null;
      return;
    }

    const itemIdx = parseInt(item.getAttribute('data-drag-index') || '-1', 10);
    if (itemIdx === -1) return;

    this.targetIndex = itemIdx;
    const rect = item.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    // Determine position: above or below item middle
    const middleY = rect.top + rect.height / 2;
    this.insertPosition = (clientY < middleY) ? 'above' : 'below';

    // Highlight integration line at specific location
    if (this.insertionLine) {
      this.insertionLine.style.opacity = '1';
      const topOffset = (this.insertPosition === 'above')
        ? rect.top - containerRect.top + this.container.scrollTop
        : rect.bottom - containerRect.top + this.container.scrollTop;
      
      this.insertionLine.style.top = topOffset + 'px';
    }

    this.applyRowShifts(itemIdx, this.insertPosition);
  }

  private applyRowShifts(hoveredIdx: number, position: 'above' | 'below') {
    this.clearRowShifts();

    // Shift elements visually to create insertion gap
    const isList = !this.options.isGrid;
    if (isList) {
      this.items.forEach((item, idx) => {
        if (idx === this.draggedIndex) return; // Skip original dragged item

        if (position === 'above') {
          if (idx >= hoveredIdx) {
            item.classList.add('shift-down');
          } else {
            item.classList.add('shift-up');
          }
        } else {
          if (idx <= hoveredIdx) {
            item.classList.add('shift-up');
          } else {
            item.classList.add('shift-down');
          }
        }
      });
    } else {
      // In grid layout, visual translation shift coordinates
      this.items.forEach((item, idx) => {
        if (idx === this.draggedIndex) return;
        
        // Simple shift pattern for Grid: cards slide slightly to show destination insertion
        if (idx === hoveredIdx) {
          item.classList.add('dropped-flash'); // subtle pulse target indication
        }
      });
    }
  }

  private clearRowShifts() {
    this.items.forEach(item => {
      item.classList.remove('shift-up', 'shift-down', 'dropped-flash');
    });
  }

  private finalizeDrop() {
    this.clearRowShifts();

    if (this.targetIndex !== null && this.draggedIndex !== null && this.targetIndex !== this.draggedIndex) {
      const order = Array.from({ length: this.items.length }, (_, i) => i);
      
      // Calculate new position
      order.splice(this.draggedIndex, 1);
      let targetIdxClean = this.targetIndex;
      if (this.insertPosition === 'below' && targetIdxClean < this.draggedIndex) {
        targetIdxClean++;
      } else if (this.insertPosition === 'above' && targetIdxClean > this.draggedIndex) {
        targetIdxClean--;
      }
      order.splice(targetIdxClean, 0, this.draggedIndex);

      // Perform reorder dispatch!
      this.options.onReorder(order);

      // Flash dropped indication
      setTimeout(() => {
        const droppedEl = this.container.querySelector(`[data-drag-index="${targetIdxClean}"]`);
        if (droppedEl) {
          droppedEl.classList.add('dropped-flash');
          setTimeout(() => droppedEl.classList.remove('dropped-flash'), 650);
        }
      }, 50);
    }

    this.cleanupCloneAndLine();
    this.isDragging = false;
    this.draggedIndex = null;
    this.targetIndex = null;
  }

  private cleanupCloneAndLine() {
    // Restore inner items
    if (this.draggedItem) {
      this.draggedItem.classList.remove('drag-placeholder');
      this.draggedItem.style.height = '';
      if (this.placeholderHTML) {
        this.draggedItem.innerHTML = this.placeholderHTML;
      }
      this.draggedItem = null;
    }

    if (this.clone && this.clone.parentNode) {
      this.clone.parentNode.removeChild(this.clone);
      this.clone = null;
    }

    if (this.insertionLine && this.insertionLine.parentNode) {
      this.insertionLine.parentNode.removeChild(this.insertionLine);
      this.insertionLine = null;
    }
  }

  private announceLive(message: string) {
    let region = document.getElementById('drag-live-announcer');
    if (!region) {
      region = document.createElement('div');
      region.id = 'drag-live-announcer';
      region.setAttribute('aria-live', 'assertive');
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.style.position = 'absolute';
      region.style.left = '-9999px';
      region.style.width = '1px';
      region.style.height = '1px';
      document.body.appendChild(region);
    }
    region.textContent = '';
    setTimeout(() => {
      if (region) region.textContent = message;
    }, 50);
  }
}
