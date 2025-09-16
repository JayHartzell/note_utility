import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-operation-selector',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './operation-selector.component.html',
  styleUrl: './operation-selector.component.scss'
})
export class OperationSelectorComponent {
  @Input() loading: boolean = false;
  @Input() processingNotes: boolean = false;
  @Input() showDeleteAllConfirm: boolean = false;
  @Output() deleteAll = new EventEmitter<void>();
  @Output() chooseMenu = new EventEmitter<void>();
  @Output() executeDeleteAll = new EventEmitter<void>();
  @Output() cancelDeleteAll = new EventEmitter<void>();

  onDeleteAllClick() {
    // Delegate state change to parent
    this.deleteAll.emit();
  }

  onCancelDeleteAll() {
    // Delegate state change to parent
    this.cancelDeleteAll.emit();
  }

  onExecuteDeleteAll() {
    this.executeDeleteAll.emit();
  }

  onChooseMenu() {
    this.chooseMenu.emit();
  }
}

