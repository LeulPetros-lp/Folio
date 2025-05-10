"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Typography,
  Box,
} from "@mui/material";
import quotesData from "./quotes";

export default function App() {
  const [quote, setQuote] = useState(null); // Initialize state for a single quote

  // Set a random quote when the component mounts
  useEffect(() => {
    const randomNum = Math.floor(Math.random() * quotesData.length);
    setQuote(quotesData[randomNum]); // Set the random quote
  }, []);

  if (!quote) {
    return <div>Loading...</div>; // Optionally render a loading state
  }

  return (
    <div>
      {/* Quote Section */}
      <Typography
        variant="h5"
        align="center"
        sx={{
          paddingTop: 10,
          paddingBottom: 6,
          fontWeight: "bold",
          fontSize: 20,
        }}
      >
        "{quote.quote}" <br />— {quote.author}, From {quote.book}
      </Typography>

      {/* Card Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-evenly",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {/* Card 1 - ISBN Code */}
        <Card sx={{ width: 450,  }} component="a" href="/isbn-add">
          <CardActionArea>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                The book has an ISBN code
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                ISBN Code
              </Typography>
            </CardContent>
            <CardMedia
              component="img"
              height="250"
              image="https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/EAN-13-ISBN-13.svg/1920px-EAN-13-ISBN-13.svg.png"
              alt="ISBN Code"
              width={50}
             
                 />
          </CardActionArea>
        </Card>

        {/* Card 2 - From Book Shelf */}
        <Card sx={{ width: 450 }} component="a" href="/shelf-add">
          <CardActionArea>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Choose the book from the book shelf
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                From Book Shelf
              </Typography>
            </CardContent>
            <CardMedia
              component="img"
              height="250"
              image="https://img-new.cgtrader.com/items/111824/1e31c2e2fe/children-book-collection-3d-model-c4d.jpg"
              alt="Book Shelf"

              width={50}
        
            />
          </CardActionArea>
        </Card>
      </Box>
    </div>
  );
}
