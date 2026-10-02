import { Quote } from 'lucide-react'

// Bundled, so it works offline and costs nothing. One quote per calendar day, in order.
const QUOTES = [
  ['The secret of getting ahead is getting started.', 'Mark Twain'],
  ['Well done is better than well said.', 'Benjamin Franklin'],
  ['It always seems impossible until it is done.', 'Nelson Mandela'],
  ['You do not have to see the whole staircase, just take the first step.', 'Martin Luther King Jr.'],
  ['Whether you think you can or you think you can’t, you’re right.', 'Henry Ford'],
  ['Action is the foundational key to all success.', 'Pablo Picasso'],
  ['Do what you can, with what you have, where you are.', 'Theodore Roosevelt'],
  ['The best way to predict the future is to create it.', 'Peter Drucker'],
  ['Quality is not an act, it is a habit.', 'Aristotle'],
  ['What you do today can improve all your tomorrows.', 'Ralph Marston'],
  ['Small deeds done are better than great deeds planned.', 'Peter Marshall'],
  ['Don’t watch the clock; do what it does. Keep going.', 'Sam Levenson'],
  ['Energy and persistence conquer all things.', 'Benjamin Franklin'],
  ['The way to get started is to quit talking and begin doing.', 'Walt Disney'],
  ['Focus on being productive instead of busy.', 'Tim Ferriss'],
  ['A year from now you may wish you had started today.', 'Karen Lamb'],
  ['Amateurs sit and wait for inspiration. The rest of us just get up and go to work.', 'Stephen King'],
  ['Done is better than perfect.', 'Sheryl Sandberg'],
  ['You don’t have to be great to start, but you have to start to be great.', 'Zig Ziglar'],
  ['The only way to do great work is to love what you do.', 'Steve Jobs'],
  ['Courage is not the absence of fear, but action in spite of it.', 'Mark Twain'],
  ['Little by little, one travels far.', 'J.R.R. Tolkien'],
  ['Discipline is the bridge between goals and accomplishment.', 'Jim Rohn'],
  ['Make each day your masterpiece.', 'John Wooden'],
  ['Plans are nothing; planning is everything.', 'Dwight D. Eisenhower'],
  ['The harder I work, the luckier I get.', 'Samuel Goldwyn'],
  ['Start where you are. Use what you have. Do what you can.', 'Arthur Ashe'],
  ['It does not matter how slowly you go as long as you do not stop.', 'Confucius'],
  ['Nothing will work unless you do.', 'Maya Angelou'],
  ['Win the morning, win the day.', 'Tim Ferriss'],
  ['One day or day one. You decide.'],
  ['Progress, not perfection.'],
  ['Break it down, then knock it down.'],
  ['Today’s small step is tomorrow’s big leap.'],
  ['Be the person your to-do list believes in.'],
  ['Clear the next task, not the whole mountain.'],
  ['Consistency beats intensity.'],
  ['Do the hard thing first.'],
  ['Slow progress is still progress.'],
  ['Your future self is watching. Make them proud.'],
  ['Finish what you started, then start what you finished.'],
  ['Focus on the next right thing.'],
  ['Every checked box is a small victory.'],
  ['Great things are done by a series of small things brought together.', 'Vincent van Gogh'],
  ['Motivation gets you going; habit keeps you growing.'],
  ['Begin anywhere.', 'John Cage'],
  ['Start now. Perfect later.'],
  ['You are one task away from a better day.'],
  ['Believe you can and you’re halfway there.', 'Theodore Roosevelt']
]

// Local calendar day number, so the quote flips at the user's midnight.
function dayNumber(d = new Date()) {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
}

function todaysQuote() {
  return QUOTES[dayNumber() % QUOTES.length]
}

// Compact one-liner for the top bar, beside the profile picture. Full text is in the tooltip.
export function HeaderQuote() {
  const [text, author] = todaysQuote()
  const full = author ? `${text} — ${author}` : text
  return (
    <p
      title={full}
      aria-label={`Quote of the day: ${full}`}
      className="hidden min-w-0 max-w-[26rem] items-center gap-2 text-sm italic text-muted lg:flex xl:max-w-[34rem]"
    >
      <Quote size={14} className="shrink-0 text-accent" aria-hidden="true" />
      <span className="truncate">{text}</span>
      {author && <span className="hidden shrink-0 text-xs not-italic xl:inline">{'— ' + author}</span>}
    </p>
  )
}

// Card version, shown on screens too narrow for the top bar.
export default function DailyQuote() {
  const [text, author] = todaysQuote()
  return (
    <figure
      aria-label="Quote of the day"
      className="mb-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-line bg-accent/5 px-3.5 py-2.5 lg:hidden"
    >
      <Quote size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
      <blockquote className="min-w-0 text-sm leading-snug">
        <p className="font-semibold italic">{text}</p>
        {author && <footer className="mt-0.5 text-xs text-muted">{author}</footer>}
      </blockquote>
    </figure>
  )
}
