BOOK_BASE = "https://nishanmudalige.github.io/STA258_Book/"

SOURCE_MAP = {
    "index.md": ("Ebook home / introduction", BOOK_BASE),
    "01-Introduction.md": ("Chapter 1: Introduction", BOOK_BASE + "introduction.html"),
    "02-An_Introduction_to_R.md": ("Chapter 2: An Introduction to R", BOOK_BASE + "an-introduction-to-r.html"),
    "03-Descriptive_Statistics.md": ("Chapter 3: Descriptive Statistics", BOOK_BASE + "descriptive-statistics.html"),
    "04-Foundations_of_Inference.md": ("Chapter 4: Foundations of Inference", BOOK_BASE + "foundations-of-inference.html"),
    "05-Confidence_Intervals.md": ("Chapter 5: Confidence Intervals", BOOK_BASE + "confidence-intervals.html"),
    "06-Hypothesis_Tests.md": ("Chapter 6: Hypothesis Tests", BOOK_BASE + "hypothesis-tests.html"),
    "07-Statistical_Power.md": ("Chapter 7: Statistical Power", BOOK_BASE + "statistical-power.html"),
    "08-Analysis_of_Variance.md": ("Chapter 8: Analysis of Variance", BOOK_BASE + "analysis-of-variance.html"),
    "09-Simple_Linear_Regression.md": ("Chapter 9: Simple Linear Regression", BOOK_BASE + "simple-linear-regression.html"),
    "10-Analysis_of_Categorical_Data.md": ("Chapter 10: Analysis of Categorical Data", BOOK_BASE + "analysis-of-categorical-data.html"),
}

def source_details(filename: str):
    if filename in SOURCE_MAP:
        label, url = SOURCE_MAP[filename]
        return {"filename": filename, "label": label, "url": url}
    if filename.startswith("dataset-"):
        label = filename.removeprefix("dataset-").removesuffix(".md").replace("_", " ").replace("-", " ")
        return {"filename": filename, "label": f"Dataset: {label}", "url": BOOK_BASE}
    return {"filename": filename, "label": filename, "url": BOOK_BASE}
