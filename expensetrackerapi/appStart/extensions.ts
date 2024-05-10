
///Array extensions

Array.prototype.contains = Array.prototype.contains || function (item: any) {
    return this.indexOf(item) >= 0;
}

Array.prototype.distinct = Array.prototype.distinct || function () {

    var ret = [];
    for (var i = 0; i < this.length; i++) {
        if (!ret.contains(this[i])) {
            ret.push(this[i]);
        }
    }

    return ret;

}

Array.prototype.remove = Array.prototype.remove || function (item, all) {
    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i] === item) {
            this.splice(i, 1);
            if (!all)
                break;
        }
    }
    return this;
}

Array.prototype.sortBy = Array.prototype.sortBy || function (sortColumns: Array<any>) {
    var srt = new sortUtil();
    var ret = (this as Array<any>).sort(srt.sorterBy(sortColumns));
    return ret as Array<any>;
}

Array.prototype.groupBy = Array.prototype.groupBy || function (column: string) {
    let group = (this as Array<any>).reduce((r, a) => {
        r[a[column]] = [...r[a[column]] || [], a];
        return r;
    }, {});
    return group;
}

//String extensions

String.prototype.contains = function (inputString) {
    return this.indexOf(inputString) >= 0;
}

String.isNullOrWhiteSpace = function (str) {
    if (str != undefined && str != null)
        str = str.toString();
    else
        str = "";
    return str.trim().length == 0;
}

Number.prototype.countDecimals = function () {

    if (Math.floor(this.valueOf()) === this.valueOf()) return 0;

    var str = this.toString();
    if (str.indexOf(".") !== -1 && str.indexOf("-") !== -1) {
        return str.split("-")[1] || 0;
    } else if (str.indexOf(".") !== -1) {
        return str.split(".")[1].length || 0;
    }
    return str.split("-")[1] || 0;
}

Number.prototype.toFixedNoRounding = function (n) {
    const reg = new RegExp("^-?\\d+(?:\\.\\d{0," + n + "})?", "g")
    const a = this.toString().match(reg)[0];
    const dot = a.indexOf(".");
    if (dot === -1) { // integer, insert decimal dot and pad up zeros
        return Number.parseFloat(a + "." + "0".repeat(n));
    }
    const b = n - (a.length - dot) + 1;
    return b > 0 ? Number.parseFloat((a + "0".repeat(b))) : Number.parseFloat(a);
}

class sortUtil {
    public sorterBy = (properties) => {
        return (a, b) => {
            let result = 0;
            for (let property of properties) {
                //console.log("property:" + property);
                if (result)
                    return result;
                else
                    result = this.compare(a, b, property);
            }
            return result;
        }
    }

    private compare = (a, b, property) => {

        let name = property[0], direction: number, type: string;

        //'1' for ascending and '-1' for descending
        if ((property[1] || "").toString().indexOf('des') != -1 || property[1] == -1) {
            direction = -1;
        } else {
            direction = 1;
        }

        //Handeling Sub Object
        if (name.indexOf('.') != -1) {
            var beforeDot = name.substr(0, name.indexOf('.'));
            var afterDot = name.substr(name.indexOf('.') + 1);
            a = a[beforeDot][afterDot];
            b = b[beforeDot][afterDot];
            //console.log("a:" + a + "  ,b:" + b);                               
        } else {
            a = a[name];
            b = b[name];
        }

        //creating Type
        if (isNaN(a) || isNaN(b)) {
            type = 'string';
        } else {
            type = 'number';
        }

        if (property && property[2] && property[2] == 'date') {
            type = 'date';
        }

        if (direction === -1) [b, a] = [a, b];
        switch (type) {
            case 'number':
                a = +a;
                b = +b;
                return a < b ? -1 : a === b ? 0 : 1;
            case 'string':
                a += '';
                b += '';
                return a.localeCompare(b);
            case 'date':
                let datea = new Date(a).getTime();
                let dateb = new Date(b).getTime();
                return datea - dateb;
        }
        return 0;
    }

    public checkIsNumber(data: any): boolean {
        if (data != null && data != undefined && !isNaN(data)) {
            return true;
        } else {
            return false;
        }
    }

    public checkIsString(data: any): boolean {
        if (data != null && data != undefined && ((typeof data) == "string")) {
            return true;
        } else {
            return false;
        }
    }
}