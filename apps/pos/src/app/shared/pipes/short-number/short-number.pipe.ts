// https://nimishgoel056.medium.com/display-number-in-billion-million-thousand-using-custom-pipe-in-angular-b95bf388350a

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'shortNumber',
    standalone: true,
})
export class ShortNumber implements PipeTransform {
    transform(value: any): string {
        return (Number(value)).toFixed(2)
    }
}