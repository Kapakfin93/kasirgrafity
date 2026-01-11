
export const formatRupiah = (amount) => {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
};

export const formatDimensions = (length, width) => {
    if (length && width) return `${length}m x ${width}m`;
    if (length) return `${length}m`;
    return '-';
};
