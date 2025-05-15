import { Box, Typography, Button } from '@mui/material';
// import img1 from 'public/images/backgrounds/rocket.png';
import Image from 'next/image';
import Link from 'next/link';

export const Upgrade = () => {
    return (
        <Box
            display='flex'
            alignItems="center"
            gap={2}
            sx={{ m: 3, p: 3, bgcolor: 'primary.light', borderRadius: '8px' }}
        >
            <>
                <Typography variant='h1'>Date:</Typography>
            </>
        </Box>
    );
};
