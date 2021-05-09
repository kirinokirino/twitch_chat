export function zip(arrays) {
    return arrays[0].map(function (_, i) {
        return arrays.map(function (array) {
            return array[i];
        });
    });
}

export function fade_in(el) {
    el.classList.add("show");
    el.classList.remove("hide");
}

export function fade_out(el) {
    el.classList.add("hide");
    el.classList.remove("show");
}
