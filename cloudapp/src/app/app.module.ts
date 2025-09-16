import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, inject, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AlertModule, CloudAppTranslateModule, InitService, MaterialModule } from '@exlibris/exl-cloudapp-angular-lib';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainComponent } from './main/main.component';

@NgModule({
    declarations: [
        AppComponent
    ],
    bootstrap: [AppComponent],
    imports: [
        MaterialModule,
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        AlertModule,
        FormsModule,
        ReactiveFormsModule,
        CloudAppTranslateModule.forRoot()],
    providers: [
        { provide: APP_INITIALIZER, useFactory: () => () => true, deps: [InitService], multi: true },
        provideHttpClient(withInterceptorsFromDi())
    ]
})
export class AppModule { }
