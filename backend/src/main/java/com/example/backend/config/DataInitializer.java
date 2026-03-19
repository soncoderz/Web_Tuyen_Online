package com.example.backend.config;

import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.example.backend.model.*;
import com.example.backend.repository.*;

@Component
@Order(2)
public class DataInitializer implements CommandLineRunner {

    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private AuthorRepository authorRepository;
    @Autowired private StoryRepository storyRepository;
    @Autowired private ChapterRepository chapterRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Only seed if no stories exist (first run)
        if (storyRepository.count() > 0) {
            System.out.println("=== Data already exists, skipping seed ===");
            return;
        }

        System.out.println("=== Seeding sample data ===");

        // --- Create Admin User ---
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User("admin", "admin@truyenhub.com", passwordEncoder.encode("123456"));
            Set<Role> adminRoles = new HashSet<>();
            roleRepository.findByName(ERole.ROLE_ADMIN).ifPresent(adminRoles::add);
            roleRepository.findByName(ERole.ROLE_USER).ifPresent(adminRoles::add);
            admin.setRoles(adminRoles);
            userRepository.save(admin);
            System.out.println("Created admin user: admin / 123456");
        }

        // --- Create Test User ---
        if (!userRepository.existsByUsername("reader1")) {
            User reader = new User("reader1", "reader1@gmail.com", passwordEncoder.encode("123456"));
            Set<Role> userRoles = new HashSet<>();
            roleRepository.findByName(ERole.ROLE_USER).ifPresent(userRoles::add);
            reader.setRoles(userRoles);
            userRepository.save(reader);
            System.out.println("Created user: reader1 / 123456");
        }

        // --- Create Categories ---
        Category catTienHiep = createCategoryIfNotExists("Tiên Hiệp", "Truyện tu tiên, thần tiên, tiên giới");
        Category catHuyenHuyen = createCategoryIfNotExists("Huyền Huyễn", "Truyện huyền huyễn, thế giới kỳ ảo");
        Category catDoThi = createCategoryIfNotExists("Đô Thị", "Truyện đô thị, hiện đại");
        Category catKinhDi = createCategoryIfNotExists("Kinh Dị", "Truyện kinh dị, ma quái, rùng rợn");
        Category catNgonTinh = createCategoryIfNotExists("Ngôn Tình", "Truyện tình cảm, lãng mạn");
        Category catVoHiep = createCategoryIfNotExists("Võ Hiệp", "Truyện kiếm hiệp, võ lâm");
        Category catHaiHuoc = createCategoryIfNotExists("Hài Hước", "Truyện hài hước, giải trí");
        Category catLichSu = createCategoryIfNotExists("Lịch Sử", "Truyện lịch sử, cổ đại");

        // --- Create Authors ---
        Author author1 = createAuthorIfNotExists("Thiên Tàm Thổ Đậu", "Tác giả nổi tiếng với Đấu Phá Thương Khung");
        Author author2 = createAuthorIfNotExists("Ngã Cật Tây Hồng Thị", "Tác giả Phàm Nhân Tu Tiên");
        Author author3 = createAuthorIfNotExists("Thần Đông", "Tác giả Tuyệt Thế Đường Môn");
        Author author4 = createAuthorIfNotExists("Nhĩ Căn", "Tác giả Tiên Nghịch, Ngã Dục Phong Thiên");
        Author author5 = createAuthorIfNotExists("Đường Gia Tam Thiếu", "Tác giả Đấu La Đại Lục");

        // --- Create Stories ---
        Story story1 = createStory("Đấu Phá Thương Khung",
            "Tam thập niên hà đông, tam thập niên hà tây, mạc khi thiếu niên cùng! Thiên tài thiếu niên Tiêu Viêm, từng bước bước lên đỉnh cao đại lục.",
            EStoryStatus.COMPLETED, 15680L,
            new HashSet<>(Arrays.asList(catHuyenHuyen, catTienHiep)),
            new HashSet<>(List.of(author1)));

        Story story2 = createStory("Phàm Nhân Tu Tiên",
            "Một thanh niên bình thường bước vào con đường tu tiên, trải qua vô số gian nan, cuối cùng đạt được tiên đạo.",
            EStoryStatus.COMPLETED, 23450L,
            new HashSet<>(List.of(catTienHiep)),
            new HashSet<>(List.of(author2)));

        Story story3 = createStory("Đấu La Đại Lục",
            "Đường Tam, ngoại môn đệ tử của Đường Môn, vì trộm học tuyệt kỹ nội môn, bị đuổi khỏi sư môn. Từ đó anh bắt đầu cuộc hành trình mới.",
            EStoryStatus.ONGOING, 34200L,
            new HashSet<>(Arrays.asList(catHuyenHuyen, catVoHiep)),
            new HashSet<>(List.of(author5)));

        Story story4 = createStory("Tiên Nghịch",
            "Tu tiên chi lộ, thuận thiên thì sống, nghịch thiên thì chết! Một thiếu niên bình thường bước lên con đường nghịch thiên.",
            EStoryStatus.ONGOING, 8900L,
            new HashSet<>(List.of(catTienHiep)),
            new HashSet<>(List.of(author4)));

        Story story5 = createStory("Thần Ấn Vương Tọa",
            "Trong thế giới đầy rẫy ma tộc, con người sống trong sự sợ hãi. Một thiếu niên bình thường mang trong mình sức mạnh đặc biệt.",
            EStoryStatus.ONGOING, 5600L,
            new HashSet<>(Arrays.asList(catHuyenHuyen, catDoThi)),
            new HashSet<>(List.of(author3)));

        // --- Create Chapters for Story 1 ---
        createChapter(story1.getId(), 1, "Vân Lam Tông",
            "Đại lục Đấu Khí, không có hoa lệ chi ma pháp, có đích chỉ phồn hoa đích đấu khí!\n\nTại đại lục này, đấu khí tu luyện tiêu chuẩn cùng thực lực, được chia thành: Đấu Giả, Đấu Sư, Đại Đấu Sư, Đấu Linh, Đấu Vương, Đấu Hoàng, Đấu Tông, Đấu Tôn, Đấu Thánh, Đấu Đế.\n\nTiêu Viêm, một thiếu niên mười lăm tuổi, đang đứng ở luyện công trường của Tiêu gia tộc. Gió lạnh thổi qua, lay động mái tóc đen nhánh của hắn.\n\n\"Tiêu Viêm, dùng chưởng lực đánh vào trụ luyện!\" Một thanh âm trầm hùng vang lên.\n\nTiêu Viêm gật đầu, vận tụ đấu khí trong cơ thể, một quyền đánh ra...");

        createChapter(story1.getId(), 2, "Thiên Tài Trở Thành Phế Vật",
            "\"Đấu khí giai đoạn bảy... ba năm trước, hắn còn là thiên tài gia tộc, bây giờ...\"\n\nNhững lời thì thầm vang lên xung quanh, Tiêu Viêm cắn chặt răng. Ba năm qua, đấu khí của hắn không ngừng thụt lùi, từ một thiên tài được kỳ vọng trở thành phế vật bị mọi người chê cười.\n\nNhưng Tiêu Viêm biết, sự suy yếu này không bình thường. Trong một lần vô tình, hắn phát hiện nhẫn đen trên tay mình phát ra ánh sáng kỳ lạ...\n\n\"Tiểu tử, rốt cuộc ngươi cũng phát hiện ta rồi.\" Một giọng nói cổ xưa vang lên trong đầu Tiêu Viêm.");

        createChapter(story1.getId(), 3, "Dược Lão",
            "\"Ta là Dược Lão, cũng chính là linh hồn cư ngụ trong Xuyên Vân Nhẫn của ngươi.\"\n\nTiêu Viêm kinh ngạc nhìn vào nhẫn đen. Một luồng ký ức tràn vào tâm trí hắn - Dược Lão, một vị Đấu Đế tồn tại từ nghìn năm trước.\n\n\"Lý do đấu khí của ngươi thụt lùi, bởi vì ta cần hấp thu đấu khí để duy trì linh hồn. Nhưng bây giờ ta đã ổn định, ta sẽ bù đắp cho ngươi.\"\n\nDược Lão bắt đầu truyền thụ cho Tiêu Viêm một bộ công pháp cổ xưa - Phần Quyết.");

        // --- Create Chapters for Story 2 ---
        createChapter(story2.getId(), 1, "Khởi Đầu",
            "Hàn Lập, một thiếu niên bình thường ở một ngôi làng nhỏ, vô tình được nhận vào Thất Huyền Môn - một tông phái tu tiên nhỏ.\n\nBước chân vào thế giới tu tiên, Hàn Lập bắt đầu hành trình dài vô tận với vô vàn hiểm nguy và cơ duyên.\n\n\"Phàm nhân cũng có thể tu tiên!\" - đó là câu nói mà sư phụ hắn nói với hắn trong ngày đầu tiên.");

        createChapter(story2.getId(), 2, "Luyện Đan",
            "Sau nửa năm khổ tu, Hàn Lập bắt đầu tiếp xúc với thuật luyện đan. Dù tư chất tu tiên tầm thường, nhưng hắn lại có thiên phú đặc biệt trong việc nhận biết linh dược.\n\n\"Đây là... Thiên Niên Linh Chi?\" Hàn Lập nhận diện thanh dược trong vườn thuốc.\n\nSư phụ gật đầu hài lòng: \"Không tồi, mi có đôi mắt tốt.\"");

        // --- Create Chapters for Story 3 ---
        createChapter(story3.getId(), 1, "Đường Tam",
            "Đường Tam, ngoại môn đệ tử lớn nhất Đường Môn, đã trộm học Nội Môn tuyệt kỹ \"Huyền thiên bảo lục\" và \"Ám khí bách giải\", bị sư phụ phát hiện.\n\nĐứng trên Quỷ Kiến Sầu đỉnh, Đường Tam nhìn xuống vực sâu thăm thẳm. \"Đường Môn, kiếp này ta đã dành hết cho ngươi rồi.\"\n\nNhắm mắt, hắn bước xuống...\n\nKhi mở mắt ra, hắn phát hiện mình đang nằm trên một chiếc giường gỗ, trong một căn phòng hoàn toàn xa lạ. Hắn đã trùng sinh!");

        System.out.println("=== Sample data seeded successfully! ===");
        System.out.println("Admin login: admin / 123456");
        System.out.println("User login: reader1 / 123456");
    }

    private Category createCategoryIfNotExists(String name, String description) {
        List<Category> cats = categoryRepository.findAll();
        for (Category c : cats) {
            if (c.getName().equals(name)) return c;
        }
        return categoryRepository.save(new Category(name, description));
    }

    private Author createAuthorIfNotExists(String name, String description) {
        List<Author> auths = authorRepository.findAll();
        for (Author a : auths) {
            if (a.getName().equals(name)) return a;
        }
        return authorRepository.save(new Author(name, description));
    }

    private Story createStory(String title, String description, EStoryStatus status,
                               Long views, Set<Category> categories, Set<Author> authors) {
        Story story = new Story(title, description, status);
        story.setViews(views);
        story.setCategories(categories);
        story.setAuthors(authors);
        return storyRepository.save(story);
    }

    private void createChapter(String storyId, int number, String title, String content) {
        Chapter chapter = new Chapter(storyId, number, title, content);
        chapterRepository.save(chapter);
    }
}
