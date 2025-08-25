import axios from 'axios';
// @ts-ignore
import * as cheerio from 'cheerio-without-node-native';

const headers = {
  'User-Agent': 'PostmanRuntime/7.45.0',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  Referer: 'https://www.google.com/',
};

export const getIMDBRating = async (id: string) => {
  try {
    console.log('ID', id);
    const response = await axios.get(`https://imdb.com/title/${id}`, {
      headers,
    });

    const $ = cheerio.load(response.data);
    // Get the rating container first
    const ratingContainer = $(
      '[data-testid="hero-rating-bar__aggregate-rating"]',
    );

    // Extract rating from the score element
    const rating = ratingContainer
      .find('[data-testid="hero-rating-bar__aggregate-rating__score"]')
      .text()
      .split('/')[0] // Gets "7.2" from "7.2/10"
      .trim();

    // Vote count is in the element that comes after the score element
    const voteCount = ratingContainer
      .find('[data-testid="hero-rating-bar__aggregate-rating__score"]')
      .first()
      .next() // Skip the empty div (.sc-4dc495c1-5)
      .next() // Get the vote count element
      .text()
      .trim();

    const director = $(
      'li[data-testid="title-pc-principal-credit"] .ipc-metadata-list-item__list-content-item',
    )
      .first()
      .text()
      .trim();

    return {rating, voteCount, director};
  } catch (error) {
    console.log('errrrrrrr', error);
  }
};

export const getIMDBSeriesRating = async (title: string, year: string) => {
  try {
    console.log('title', title);
    console.log('year', year);

    const response = await axios.get(
      `https://imdb.com/find?title=${title}&title_type=tv_series&release_date=${year}`,
      {
        headers,
      },
    );

    const $ = cheerio.load(response.data);
    // Step 1: find the span with aria-label starting with "IMDb rating:"
    const imdbRatingSpan = $('span[aria-label^="IMDb rating:"]').first();

    // Step 2: get its child spans
    const rating = imdbRatingSpan.find('span').first().text().trim();
    const voteCount = imdbRatingSpan
      .find('span')
      .eq(1)
      .text()
      .replace(/[()]/g, '')
      .trim();

    console.log('rating', rating);
    console.log('voteCount', voteCount);

    return {rating, voteCount};
  } catch (error) {
    console.log('errrrrrrr', error);
  }
};
