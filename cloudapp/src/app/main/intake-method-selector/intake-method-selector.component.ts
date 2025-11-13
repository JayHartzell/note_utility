import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-intake-method-selector',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './intake-method-selector.component.html',
  styleUrl: './intake-method-selector.component.scss'
})
export class IntakeMethodSelectorComponent {
  @Input() loading: boolean = false;
  @Input() processingNotes: boolean = false;
  
  @Output() selectSetMethod = new EventEmitter<void>();
  @Output() selectFileMethod = new EventEmitter<void>();

  onSelectSetMethod() {
    this.selectSetMethod.emit();
  }

  onSelectFileMethod() {
    this.selectFileMethod.emit();
  }
}
