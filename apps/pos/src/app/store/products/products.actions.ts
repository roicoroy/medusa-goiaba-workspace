export namespace ProductsActions {
  export class FetchProducts {
    static readonly type = '[Products] Fetch Products';
  }

  export class SearchAndAddByBarcode {
    static readonly type = '[Products] Search and Add by Barcode';
    constructor(public barcode: string) {}
  }
}
