export type IconProps = {
    name: 'filter_list' | 'help' | 'delete' | 'settings' | 'clapperboard' | 'play_arrow' | 'stop' | 'swap_horiz';
    /** small 16px, default 20px, large 24px (1:1 with the 24-unit viewBox, so crisp edges). */
    size?: 'small' | 'large';
};

// Material Design icon paths (24x24 viewBox), inlined so the extension carries
// no Material Symbols font dependency. Fill inherits the button's text colour
// via currentColor, which also drives the active/toggled highlight.
const PATHS: Record<IconProps['name'], string> = {
    filter_list: 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z',
    help: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z',
    delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    // Andrew's clapperboard.svg (both nonzero-fill paths merged into one).
    clapperboard:
        'M0.501,10.67l2.5,4.33l18.187,-10.5l-2.5,-4.33l-18.187,10.5Zm1.378,0.387l1.732,-1l-0.744,2.711l-0.988,-1.711Zm2.598,-1.5l1.752,-1.04l-1.137,4.106l-1.74,0.987l1.125,-4.053Zm3.481,-2.01l1.703,-1.011l-1.12,4.061l-1.724,1.013l1.141,-4.063Zm3.435,-2.011l1.716,-0.962l-1.057,4.032l-1.757,1.028l1.098,-4.098Zm3.513,-2l1.718,-1.02l-1.133,4.118l-1.732,1l1.147,-4.098Zm3.381,-1.98l1.034,1.712l-0.366,1.366l-1.732,1l1.064,-4.078Z' +
        'M3,15l0,9l21,0l0,-9l-21,0Zm1,1.024l2,0l-2,1.976l0,-1.976Zm3,0l2.038,-0.024l-3.038,2.988l-2.001,-0.016l3.001,-2.948Zm4.02,0l1.98,-0.024l-3,2.957l-2,0.016l3.02,-2.948Zm3.98,-0.024l1.967,0.024l-2.931,2.963l-2.036,0.012l3,-3Zm4.042,0.024l1.998,-0.024l-3.041,3l-2,0l3.042,-2.976Zm3.918,-0.024l0.04,2l-1,1l-2,0l2.96,-3Zm-18.96,4l19,0l0,4l-19,0l-0,-4Z',
    play_arrow: 'M8 5v14l11-7z',
    swap_horiz: 'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
    stop: 'M6 6h12v12H6z',
    settings:
        'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
};

export const Icon: React.FC<IconProps> = ({ name, size }) => {
    const px = size === 'small' ? '1rem' : size === 'large' ? '1.5rem' : '1.25rem';
    return (
        <svg
            className="icon"
            viewBox="0 0 24 24"
            width={px}
            height={px}
            aria-hidden="true"
            focusable="false">
            <path d={PATHS[name]} />
        </svg>
    );
};
