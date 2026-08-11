export namespace RegionsActions {
    export class SetSelectedCountry {
        static readonly type = '[RegionsActions] Set Selected Country';
        constructor(public country: string) { }
    }
    export class ClearSelectedCountry {
        static readonly type = '[RegionsActions] Clear Selected Country';
    }
    export class ClearCountryList {
        static readonly type = '[RegionsActions] Clear Country List';
    }
    export class GetCountries {
        static readonly type = '[RegionsActions] Get Medusa Countries';
    }
    export class LogOut {
        static readonly type = '[RegionsActions] Logout';
    }
}
