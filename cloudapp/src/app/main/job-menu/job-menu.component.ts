import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MenuOption } from '../../interfaces/note.interface';

@Component({
  selector: 'app-job-menu',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './job-menu.component.html',
  styleUrl: './job-menu.component.scss'
})
export class JobMenuComponent {
  @Input() availableMenuOptions: MenuOption[] = [];
  @Input() jobExecuted: boolean = false;
  @Output() addJobParameter = new EventEmitter<string>();

  getMenuOptionsByCategory(category: string): MenuOption[] {
    return this.availableMenuOptions.filter(option => option.category === category);
  }
}

